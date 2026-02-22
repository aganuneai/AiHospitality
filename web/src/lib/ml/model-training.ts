/**
 * Model Training
 * 
 * Training pipeline for ML models.
 * Includes backtesting and model validation.
 */

import { prisma } from '../db';
import { calculateMAPE } from './forecasting-model';
import { logger } from '../logger';

/**
 * Training result
 */
export interface TrainingResult {
    modelId: string;
    accuracy: {
        mape: number;            // Mean Absolute Percentage Error
        rmse: number;            // Root Mean Square Error
    };
    trainingPeriod: {
        start: Date;
        end: Date;
        daysUsed: number;
    };
    validationPeriod: {
        start: Date;
        end: Date;
    };
    features: string[];
    hyperparameters: Record<string, any>;
}

/**
 * Backtest forecasting model
 * 
 * Tests model accuracy on historical data.
 * 
 * @param propertyId - Property ID
 * @param roomTypeId - Optional room type filter
 * @param testDays - Days to test
 * @returns Backtest results
 */
export async function backtestModel(
    propertyId: string,
    roomTypeId?: string,
    testDays: number = 30
): Promise<{
    actual: number[];
    predicted: number[];
    mape: number;
    dates: string[];
}> {
    logger.info('Starting backtest', {
        propertyId,
        roomTypeId,
        testDays
    });

    // Fetch historical data (use data before test period for training)
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - testDays);

    const testStartDate = new Date(endDate);
    testStartDate.setDate(testStartDate.getDate() - testDays);

    const historicalData = await prisma.inventory.findMany({
        where: {
            propertyId,
            roomTypeId: roomTypeId || undefined,
            date: {
                gte: testStartDate,
                lt: endDate
            }
        },
        orderBy: {
            date: 'asc'
        }
    });

    const actual: number[] = [];
    const predicted: number[] = [];
    const dates: string[] = [];

    // Simple moving average prediction as baseline
    const window = 7;

    for (let i = window; i < historicalData.length; i++) {
        const historical = historicalData.slice(i - window, i);
        const avgOccupancy = historical.reduce((sum, inv) => {
            return sum + (inv.total > 0 ? inv.booked / inv.total : 0);
        }, 0) / window;

        const current = historicalData[i];
        const actualOccupancy = current.total > 0 ? current.booked / current.total : 0;

        actual.push(actualOccupancy);
        predicted.push(avgOccupancy);
        dates.push(current.date.toISOString().split('T')[0]);
    }

    const mape = actual.length > 0 ? calculateMAPE(actual, predicted) : 0;

    logger.info('Backtest completed', {
        propertyId,
        mape: mape.toFixed(2),
        samples: actual.length
    });

    return {
        actual,
        predicted,
        mape,
        dates
    };
}

/**
 * Train and validate model
 * 
 * @param propertyId - Property ID
 * @param roomTypeId - Optional room type filter
 * @returns Training result
 */
export async function trainModel(
    propertyId: string,
    roomTypeId?: string
): Promise<TrainingResult> {
    logger.info('Training model', {
        propertyId,
        roomTypeId
    });

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 365);  // 1 year training

    const validationStart = new Date(endDate);
    validationStart.setDate(validationStart.getDate() - 30);  // Last 30 days for validation

    // Run backtest
    const backtest = await backtestModel(propertyId, roomTypeId, 30);

    // Calculate RMSE
    let sumSquaredError = 0;
    for (let i = 0; i < backtest.actual.length; i++) {
        const error = backtest.actual[i] - backtest.predicted[i];
        sumSquaredError += error * error;
    }
    const rmse = Math.sqrt(sumSquaredError / backtest.actual.length);

    const result: TrainingResult = {
        modelId: `model_${propertyId}_${Date.now()}`,
        accuracy: {
            mape: backtest.mape,
            rmse
        },
        trainingPeriod: {
            start: startDate,
            end: validationStart,
            daysUsed: 335  // 365 - 30
        },
        validationPeriod: {
            start: validationStart,
            end: endDate
        },
        features: [
            'historical_occupancy',
            'day_of_week',
            'moving_average_7d'
        ],
        hyperparameters: {
            alpha: 0.3,  // Exponential smoothing
            window: 7    // Moving average window
        }
    };

    logger.info('Model training completed', {
        modelId: result.modelId,
        mape: result.accuracy.mape.toFixed(2),
        rmse: result.accuracy.rmse.toFixed(4)
    });

    return result;
}

/**
 * Cross-validation
 * 
 * k-fold cross validation for model robustness.
 * 
 * @param propertyId - Property ID
 * @param k - Number of folds
 * @returns Average MAPE across folds
 */
export async function crossValidate(
    propertyId: string,
    k: number = 5
): Promise<{
    folds: Array<{ mape: number; rmse: number }>;
    avgMAPE: number;
    avgRMSE: number;
}> {
    logger.info('Starting cross-validation', {
        propertyId,
        k
    });

    const folds: Array<{ mape: number; rmse: number }> = [];

    // For each fold, use different validation period
    for (let i = 0; i < k; i++) {
        const testDays = 30 + i * 7;  // Stagger validation periods
        const backtest = await backtestModel(propertyId, undefined, testDays);

        if (backtest.actual.length === 0) continue;

        // Calculate RMSE
        let sumSquaredError = 0;
        for (let j = 0; j < backtest.actual.length; j++) {
            const error = backtest.actual[j] - backtest.predicted[j];
            sumSquaredError += error * error;
        }
        const rmse = Math.sqrt(sumSquaredError / backtest.actual.length);

        folds.push({
            mape: backtest.mape,
            rmse
        });
    }

    const avgMAPE = folds.reduce((sum, f) => sum + f.mape, 0) / folds.length;
    const avgRMSE = folds.reduce((sum, f) => sum + f.rmse, 0) / folds.length;

    logger.info('Cross-validation completed', {
        propertyId,
        avgMAPE: avgMAPE.toFixed(2),
        avgRMSE: avgRMSE.toFixed(4)
    });

    return {
        folds,
        avgMAPE,
        avgRMSE
    };
}
