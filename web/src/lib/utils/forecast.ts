/**
 * Simple linear regression forecasting utility
 */

interface DataPoint {
    date: Date;
    value: number;
}

interface ForecastResult {
    date: Date;
    forecastedValue: number;
}

/**
 * Forecast values using simple linear regression
 */
export function forecastLinearRegression(
    historicalData: DataPoint[],
    daysAhead: number
): ForecastResult[] {
    if (historicalData.length < 2) {
        return [];
    }

    // Convert dates to numeric values (days since first data point)
    const firstDate = historicalData[0].date.getTime();
    const dataPoints = historicalData.map((point, index) => ({
        x: (point.date.getTime() - firstDate) / (1000 * 60 * 60 * 24), // Days
        y: point.value
    }));

    // Calculate linear regression coefficients
    const n = dataPoints.length;
    const sumX = dataPoints.reduce((sum, p) => sum + p.x, 0);
    const sumY = dataPoints.reduce((sum, p) => sum + p.y, 0);
    const sumXY = dataPoints.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumXX = dataPoints.reduce((sum, p) => sum + p.x * p.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Generate forecast
    const lastDate = historicalData[historicalData.length - 1].date;
    const lastX = dataPoints[dataPoints.length - 1].x;

    const forecasts: ForecastResult[] = [];

    for (let i = 1; i <= daysAhead; i++) {
        const x = lastX + i;
        const forecastedValue = slope * x + intercept;

        // Clamp to reasonable values (0-100 for occupancy)
        const clampedValue = Math.max(0, Math.min(100, forecastedValue));

        const forecastDate = new Date(lastDate);
        forecastDate.setDate(forecastDate.getDate() + i);

        forecasts.push({
            date: forecastDate,
            forecastedValue: clampedValue
        });
    }

    return forecasts;
}

/**
 * Calculate moving average for smoothing
 */
export function calculateMovingAverage(
    data: DataPoint[],
    windowSize: number = 7
): DataPoint[] {
    if (data.length < windowSize) {
        return data;
    }

    const smoothed: DataPoint[] = [];

    for (let i = 0; i < data.length; i++) {
        const start = Math.max(0, i - Math.floor(windowSize / 2));
        const end = Math.min(data.length, i + Math.ceil(windowSize / 2));
        const window = data.slice(start, end);

        const avg = window.reduce((sum, p) => sum + p.value, 0) / window.length;

        smoothed.push({
            date: data[i].date,
            value: avg
        });
    }

    return smoothed;
}
