/**
 * ML Forecasting Model
 * 
 * Time-series forecasting for occupancy prediction.
 * Uses statistical models (moving averages, exponential smoothing).
 * 
 * Note: For production, consider using Prophet.js or TensorFlow.js with LSTM.
 * This implementation uses statistical methods as MVP.
 */

import { prisma } from '../db';
import { logger } from '../logger';
import * as stats from 'simple-statistics';

/**
 * Forecast result
 */
export interface ForecastResult {
    date: string;
    predictedOccupancy: number;      // 0.0 - 1.0
    confidence: {
        lower: number;
        upper: number;
    };
    trend: 'INCREASING' | 'STABLE' | 'DECREASING';
    seasonalityFactor: number;
}

/**
 * Historical occupancy data point
 */
interface OccupancyDataPoint {
    date: Date;
    occupancy: number;  // 0.0 - 1.0
}

/**
 * Fetch historical occupancy data
 * 
 * @param propertyId - Property ID
 * @param roomTypeId - Optional room type filter
 * @param daysBack - Days of history to fetch
 * @returns Historical data points
 */
async function fetchHistoricalData(
    propertyId: string,
    roomTypeId?: string,
    daysBack: number = 365
): Promise<OccupancyDataPoint[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const inventoryData = await prisma.inventory.findMany({
        where: {
            propertyId,
            roomTypeId: roomTypeId || undefined,
            date: {
                gte: startDate
            }
        },
        orderBy: {
            date: 'asc'
        }
    });

    return inventoryData.map(inv => ({
        date: inv.date,
        occupancy: inv.total > 0 ? inv.booked / inv.total : 0
    }));
}

/**
 * Calculate moving average
 * 
 * @param data - Time series data
 * @param window - Window size
 * @returns Moving averages
 */
function movingAverage(data: number[], window: number): number[] {
    const result: number[] = [];

    for (let i = 0; i < data.length; i++) {
        const start = Math.max(0, i - window + 1);
        const slice = data.slice(start, i + 1);
        result.push(stats.mean(slice));
    }

    return result;
}

/**
 * Detect seasonality
 * 
 * @param data - Historical occupancy
 * @returns Seasonal factors by day of week
 */
function detectSeasonality(data: OccupancyDataPoint[]): Record<number, number> {
    const byDayOfWeek: Record<number, number[]> = {
        0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
    };

    data.forEach(point => {
        const dayOfWeek = point.date.getDay();
        byDayOfWeek[dayOfWeek].push(point.occupancy);
    });

    const seasonalFactors: Record<number, number> = {};
    const overallMean = stats.mean(data.map(d => d.occupancy));

    for (const [day, values] of Object.entries(byDayOfWeek)) {
        if (values.length > 0) {
            const dayMean = stats.mean(values);
            seasonalFactors[parseInt(day)] = dayMean / overallMean;
        } else {
            seasonalFactors[parseInt(day)] = 1.0;
        }
    }

    return seasonalFactors;
}

/**
 * Exponential smoothing forecast
 * 
 * @param data - Historical values
 * @param alpha - Smoothing parameter (0-1)
 * @param horizon - Forecast horizon
 * @returns Forecasted values
 */
function exponentialSmoothing(
    data: number[],
    alpha: number = 0.3,
    horizon: number = 30
): number[] {
    if (data.length === 0) return [];

    const smoothed: number[] = [data[0]];

    for (let i = 1; i < data.length; i++) {
        smoothed.push(alpha * data[i] + (1 - alpha) * smoothed[i - 1]);
    }

    // Forecast future values (constant)
    const lastSmoothed = smoothed[smoothed.length - 1];
    const forecast: number[] = [];

    for (let i = 0; i < horizon; i++) {
        forecast.push(lastSmoothed);
    }

    return forecast;
}

/**
 * Calculate trend
 * 
 * @param data - Recent data points
 * @returns Trend direction
 */
function calculateTrend(data: number[]): 'INCREASING' | 'STABLE' | 'DECREASING' {
    if (data.length < 2) return 'STABLE';

    const recent = data.slice(-7);  // Last 7 days
    const earlier = data.slice(-14, -7);  // Previous 7 days

    if (recent.length === 0 || earlier.length === 0) return 'STABLE';

    const recentMean = stats.mean(recent);
    const earlierMean = stats.mean(earlier);

    const change = (recentMean - earlierMean) / earlierMean;

    if (change > 0.05) return 'INCREASING';
    if (change < -0.05) return 'DECREASING';
    return 'STABLE';
}

/**
 * Forecast occupancy
 * 
 * @param propertyId - Property ID
 * @param options - Forecast options
 * @returns Forecast results
 */
export async function forecastOccupancy(
    propertyId: string,
    options: {
        roomTypeId?: string;
        horizon?: number;  // Days to forecast
        historicalDays?: number;
    } = {}
): Promise<ForecastResult[]> {
    const horizon = options.horizon || 30;
    const historicalDays = options.historicalDays || 365;

    logger.info('Forecasting occupancy', {
        propertyId,
        horizon,
        historicalDays
    });

    try {
        // Fetch historical data
        const historical = await fetchHistoricalData(
            propertyId,
            options.roomTypeId,
            historicalDays
        );

        if (historical.length === 0) {
            throw new Error('No historical data available for forecasting');
        }

        // Extract occupancy values
        const occupancies = historical.map(h => h.occupancy);

        // Detect seasonality
        const seasonalFactors = detectSeasonality(historical);

        // Forecast using exponential smoothing
        const baseForecasts = exponentialSmoothing(occupancies, 0.3, horizon);

        // Calculate trend
        const trend = calculateTrend(occupancies);

        // Calculate confidence intervals (simple stddev-based)
        const stdDev = stats.standardDeviation(occupancies);
        const confidenceMultiplier = 1.96; // 95% confidence

        // Generate forecasts
        const forecasts: ForecastResult[] = [];
        const today = new Date();

        for (let i = 0; i < horizon; i++) {
            const forecastDate = new Date(today);
            forecastDate.setDate(forecastDate.getDate() + i + 1);

            const dayOfWeek = forecastDate.getDay();
            const seasonalFactor = seasonalFactors[dayOfWeek] || 1.0;

            const baseForecast = baseForecasts[i];
            const adjustedForecast = Math.min(1.0, Math.max(0.0, baseForecast * seasonalFactor));

            forecasts.push({
                date: forecastDate.toISOString().split('T')[0],
                predictedOccupancy: adjustedForecast,
                confidence: {
                    lower: Math.max(0.0, adjustedForecast - confidenceMultiplier * stdDev),
                    upper: Math.min(1.0, adjustedForecast + confidenceMultiplier * stdDev)
                },
                trend,
                seasonalityFactor: seasonalFactor
            });
        }

        logger.info('Occupancy forecast completed', {
            propertyId,
            daysForecasted: forecasts.length,
            avgPrediction: stats.mean(forecasts.map(f => f.predictedOccupancy)).toFixed(3)
        });

        return forecasts;

    } catch (error: any) {
        logger.error('Forecasting failed', {
            propertyId,
            error: error.message
        });
        throw error;
    }
}

/**
 * Evaluate forecast accuracy (MAPE - Mean Absolute Percentage Error)
 * 
 * @param actual - Actual values
 * @param predicted - Predicted values
 * @returns MAPE percentage
 */
export function calculateMAPE(actual: number[], predicted: number[]): number {
    if (actual.length !== predicted.length || actual.length === 0) {
        throw new Error('Arrays must have same non-zero length');
    }

    let sumAPE = 0;
    let count = 0;

    for (let i = 0; i < actual.length; i++) {
        if (actual[i] !== 0) {
            sumAPE += Math.abs((actual[i] - predicted[i]) / actual[i]);
            count++;
        }
    }

    return count > 0 ? (sumAPE / count) * 100 : 0;
}
