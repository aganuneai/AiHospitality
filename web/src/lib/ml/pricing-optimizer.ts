/**
 * Pricing Optimizer
 * 
 * Dynamic pricing based on ML forecasts and revenue optimization.
 * Maximizes RevPAR (Revenue Per Available Room).
 */

import { forecastOccupancy, ForecastResult } from './forecasting-model';
import { prisma } from '../db';
import { logger } from '../logger';

/**
 * Price recommendation
 */
export interface PriceRecommendation {
    date: string;
    baseRate: number;
    recommendedRate: number;
    adjustmentFactor: number;
    reasoning: string;
    predictedOccupancy: number;
    predictedRevPAR: number;
}

/**
 * Pricing strategy
 */
export enum PricingStrategy {
    CONSERVATIVE = 'CONSERVATIVE',   // Small adjustments
    MODERATE = 'MODERATE',            // Balanced
    AGGRESSIVE = 'AGGRESSIVE'         // Large adjustments
}

/**
 * Price elasticity
 * 
 * Estimates demand sensitivity to price changes.
 * 
 * @param historicalData - Historical price and occupancy data
 * @returns Elasticity coefficient
 */
function calculatePriceElasticity(
    historicalData: Array<{ price: number; occupancy: number }>
): number {
    if (historicalData.length < 2) return -0.5;  // Default elasticity

    // Calculate correlation between price and occupancy
    const prices = historicalData.map(d => d.price);
    const occupancies = historicalData.map(d => d.occupancy);

    const priceAvg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const occupancyAvg = occupancies.reduce((a, b) => a + b, 0) / occupancies.length;

    let numerator = 0;
    let denomPrices = 0;
    let denomOccupancies = 0;

    for (let i = 0; i < prices.length; i++) {
        const priceDiff = prices[i] - priceAvg;
        const occupancyDiff = occupancies[i] - occupancyAvg;

        numerator += priceDiff * occupancyDiff;
        denomPrices += priceDiff * priceDiff;
        denomOccupancies += occupancyDiff * occupancyDiff;
    }

    const correlation = numerator / Math.sqrt(denomPrices * denomOccupancies);

    // Elasticity typically ranges from -0.2 to -2.0 for hotels
    return Math.max(-2.0, Math.min(-0.2, correlation));
}

/**
 * Calculate optimal price
 * 
 * Uses demand forecast to maximize revenue.
 * 
 * @param baseRate - Base rate
 * @param predictedOccupancy - Forecast occupancy
 * @param strategy - Pricing strategy
 * @returns Recommended rate
 */
function calculateOptimalRate(
    baseRate: number,
    predictedOccupancy: number,
    strategy: PricingStrategy = PricingStrategy.MODERATE
): { rate: number; factor: number; reasoning: string } {
    // Define adjustment parameters per strategy
    const strategies = {
        [PricingStrategy.CONSERVATIVE]: { min: 0.90, max: 1.10, threshold: 0.15 },
        [PricingStrategy.MODERATE]: { min: 0.85, max: 1.25, threshold: 0.20 },
        [PricingStrategy.AGGRESSIVE]: { min: 0.75, max: 1.50, threshold: 0.30 }
    };

    const params = strategies[strategy];

    let factor = 1.0;
    let reasoning = 'Standard rate (moderate demand)';

    // High demand (> 80%) → Increase price
    if (predictedOccupancy > 0.80) {
        factor = 1.0 + (predictedOccupancy - 0.80) * params.threshold * 5;
        factor = Math.min(factor, params.max);
        reasoning = 'High demand forecast - price increase';
    }
    // Very low demand (< 50%) → Decrease price
    else if (predictedOccupancy < 0.50) {
        factor = 1.0 - (0.50 - predictedOccupancy) * params.threshold * 3;
        factor = Math.max(factor, params.min);
        reasoning = 'Low demand forecast - price decrease to stimulate bookings';
    }
    // Moderate demand (50-80%) → Small adjustments
    else {
        factor = 1.0 + (predictedOccupancy - 0.65) * params.threshold;
        factor = Math.max(params.min, Math.min(params.max, factor));
        reasoning = `Moderate demand (${(predictedOccupancy * 100).toFixed(0)}%) - slight adjustment`;
    }

    const rate = baseRate * factor;

    return {
        rate: Math.round(rate * 100) / 100,  // Round to 2 decimals
        factor,
        reasoning
    };
}

/**
 * Generate price recommendations
 * 
 * @param propertyId - Property ID
 * @param roomTypeId - Room type ID
 * @param ratePlanId - Rate plan ID
 * @param options - Optimization options
 * @returns Price recommendations
 */
export async function generatePriceRecommendations(
    propertyId: string,
    roomTypeId: string,
    ratePlanId: string,
    options: {
        horizon?: number;
        strategy?: PricingStrategy;
    } = {}
): Promise<PriceRecommendation[]> {
    const horizon = options.horizon || 30;
    const strategy = options.strategy || PricingStrategy.MODERATE;

    logger.info('Generating price recommendations', {
        propertyId,
        roomTypeId,
        ratePlanId,
        horizon,
        strategy
    });

    try {
        // Get occupancy forecasts
        const forecasts = await forecastOccupancy(propertyId, {
            roomTypeId,
            horizon
        });

        // Get base rates
        const today = new Date();
        const futureDate = new Date(today);
        futureDate.setDate(futureDate.getDate() + horizon);

        const baseRates = await prisma.rate.findMany({
            where: {
                ratePlanCode: ratePlanId,
                date: {
                    gte: today,
                    lte: futureDate
                }
            }
        });

        // Map base rates by date
        const rateMap = new Map(
            baseRates.map(r => [r.date.toISOString().split('T')[0], Number(r.amount)])
        );

        // Fallback base rate (use most recent or average)
        const fallbackRate = baseRates.length > 0
            ? baseRates.reduce((sum, r) => sum + Number(r.amount), 0) / baseRates.length
            : 100;

        // Room type schema does not have totalRooms
        const roomType = await prisma.roomType.findUnique({
            where: { id: roomTypeId }
        });

        // Generate recommendations
        const recommendations: PriceRecommendation[] = forecasts.map(forecast => {
            const baseRate = rateMap.get(forecast.date) || fallbackRate;

            const optimal = calculateOptimalRate(
                baseRate,
                forecast.predictedOccupancy,
                strategy
            );

            const predictedRevPAR = optimal.rate * forecast.predictedOccupancy;

            return {
                date: forecast.date,
                baseRate,
                recommendedRate: optimal.rate,
                adjustmentFactor: optimal.factor,
                reasoning: optimal.reasoning,
                predictedOccupancy: forecast.predictedOccupancy,
                predictedRevPAR
            };
        });

        logger.info('Price recommendations generated', {
            count: recommendations.length,
            avgAdjustment: (recommendations.reduce((sum, r) => sum + r.adjustmentFactor, 0) / recommendations.length).toFixed(3)
        });

        return recommendations;

    } catch (error: any) {
        logger.error('Price optimization failed', {
            propertyId,
            error: error.message
        });
        throw error;
    }
}

/**
 * Calculate total revenue impact
 * 
 * @param recommendations - Price recommendations
 * @returns Revenue comparison
 */
export function calculateRevenueImpact(
    recommendations: PriceRecommendation[]
): {
    baseRevenue: number;
    optimizedRevenue: number;
    increase: number;
    increasePercentage: number;
} {
    const baseRevenue = recommendations.reduce(
        (sum, r) => sum + r.baseRate * r.predictedOccupancy,
        0
    );

    const optimizedRevenue = recommendations.reduce(
        (sum, r) => sum + r.predictedRevPAR,
        0
    );

    const increase = optimizedRevenue - baseRevenue;
    const increasePercentage = (increase / baseRevenue) * 100;

    return {
        baseRevenue,
        optimizedRevenue,
        increase,
        increasePercentage
    };
}
