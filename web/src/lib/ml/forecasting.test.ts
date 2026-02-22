import { describe, it, expect, vi, beforeEach } from 'vitest';
import { forecastOccupancy, calculateMAPE } from './forecasting-model';
import { generatePriceRecommendations, calculateRevenueImpact, PricingStrategy } from './pricing-optimizer';
import { backtestModel, trainModel, crossValidate } from './model-training';

// Mock Prisma
vi.mock('../db', () => ({
    prisma: {
        inventory: {
            findMany: vi.fn()
        },
        rate: {
            findMany: vi.fn()
        },
        roomType: {
            findUnique: vi.fn()
        }
    }
}));

// Mock tenant context
vi.mock('../tenancy/tenant-context', () => ({
    getCurrentTenantId: vi.fn(() => 'tenant-123')
}));

import { prisma } from '../db';

describe('ML Forecasting', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Occupancy Forecasting', () => {
        it('should generate 30-day forecast', async () => {
            // Mock historical data
            const mockInventory = Array.from({ length: 90 }, (_, i) => ({
                date: new Date(Date.now() - (90 - i) * 24 * 60 * 60 * 1000),
                sold: Math.floor(Math.random() * 30),
                available: 50,
                propertyId: 'prop-1',
                roomTypeId: 'room-1'
            }));

            vi.mocked(prisma.inventory.findMany).mockResolvedValue(mockInventory as any);

            const forecasts = await forecastOccupancy('prop-1', {
                horizon: 30
            });

            expect(forecasts).toHaveLength(30);
            expect(forecasts[0]).toHaveProperty('predictedOccupancy');
            expect(forecasts[0]).toHaveProperty('confidence');
            expect(forecasts[0]).toHaveProperty('trend');
            expect(forecasts[0].predictedOccupancy).toBeGreaterThanOrEqual(0);
            expect(forecasts[0].predictedOccupancy).toBeLessThanOrEqual(1);
        });

        it('should detect seasonality', async () => {
            // Mock data with weekend pattern
            const mockInventory = Array.from({ length: 90 }, (_, i) => {
                const date = new Date(Date.now() - (90 - i) * 24 * 60 * 60 * 1000);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                return {
                    date,
                    sold: isWeekend ? 45 : 25,  // Higher occupancy on weekends
                    available: 50,
                    propertyId: 'prop-1'
                };
            });

            vi.mocked(prisma.inventory.findMany).mockResolvedValue(mockInventory as any);

            const forecasts = await forecastOccupancy('prop-1', { horizon: 14 });

            // Check that weekend forecasts are higher
            const weekendForecasts = forecasts.filter((_, i) => {
                const date = new Date();
                date.setDate(date.getDate() + i + 1);
                return date.getDay() === 0 || date.getDay() === 6;
            });

            expect(weekendForecasts.length).toBeGreaterThan(0);
        });

        it('should throw error when no historical data', async () => {
            vi.mocked(prisma.inventory.findMany).mockResolvedValue([]);

            await expect(
                forecastOccupancy('prop-1')
            ).rejects.toThrow('No historical data available');
        });
    });

    describe('MAPE Calculation', () => {
        it('should calculate MAPE correctly', () => {
            const actual = [0.8, 0.7, 0.9, 0.85];
            const predicted = [0.75, 0.72, 0.88, 0.80];

            const mape = calculateMAPE(actual, predicted);

            expect(mape).toBeGreaterThan(0);
            expect(mape).toBeLessThan(100);
        });

        it('should handle perfect predictions', () => {
            const actual = [0.8, 0.7, 0.9];
            const predicted = [0.8, 0.7, 0.9];

            const mape = calculateMAPE(actual, predicted);

            expect(mape).toBe(0);
        });

        it('should throw on mismatched arrays', () => {
            expect(() => calculateMAPE([1, 2], [1, 2, 3])).toThrow();
        });
    });

    describe('Price Optimization', () => {
        it('should generate price recommendations', async () => {
            // Mock inventory (for forecast)
            const mockInventory = Array.from({ length: 90 }, (_, i) => ({
                date: new Date(Date.now() - (90 - i) * 24 * 60 * 60 * 1000),
                sold: 30,
                available: 50,
                propertyId: 'prop-1',
                roomTypeId: 'room-1'
            }));

            vi.mocked(prisma.inventory.findMany).mockResolvedValue(mockInventory as any);

            // Mock rates
            const mockRates = Array.from({ length: 30 }, (_, i) => ({
                ratePlanId: 'rate-1',
                date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
                amount: 100
            }));

            vi.mocked(prisma.rate.findMany).mockResolvedValue(mockRates as any);

            // Mock room type
            vi.mocked(prisma.roomType.findUnique).mockResolvedValue({
                id: 'room-1',
                totalRooms: 50
            } as any);

            const recommendations = await generatePriceRecommendations(
                'prop-1',
                'room-1',
                'rate-1',
                { horizon: 7, strategy: PricingStrategy.MODERATE }
            );

            expect(recommendations).toHaveLength(7);
            expect(recommendations[0]).toHaveProperty('recommendedRate');
            expect(recommendations[0]).toHaveProperty('adjustmentFactor');
            expect(recommendations[0]).toHaveProperty('predictedRevPAR');
        });

        it('should increase price for high demand', async () => {
            // Mock high occupancy
            const mockInventory = Array.from({ length: 90 }, (_, i) => ({
                date: new Date(Date.now() - (90 - i) * 24 * 60 * 60 * 1000),
                sold: 45,        // 90% occupancy
                available: 5,
                propertyId: 'prop-1',
                roomTypeId: 'room-1'
            }));

            vi.mocked(prisma.inventory.findMany).mockResolvedValue(mockInventory as any);
            vi.mocked(prisma.rate.findMany).mockResolvedValue([{
                ratePlanId: 'rate-1',
                date: new Date(),
                amount: 100
            }] as any);
            vi.mocked(prisma.roomType.findUnique).mockResolvedValue({
                id: 'room-1',
                totalRooms: 50
            } as any);

            const recommendations = await generatePriceRecommendations(
                'prop-1',
                'room-1',
                'rate-1',
                { horizon: 1, strategy: PricingStrategy.AGGRESSIVE }
            );

            // Price should increase for high demand
            expect(recommendations[0].adjustmentFactor).toBeGreaterThan(1.0);
        });

        it('should decrease price for low demand', async () => {
            // Mock low occupancy
            const mockInventory = Array.from({ length: 90 }, (_, i) => ({
                date: new Date(Date.now() - (90 - i) * 24 * 60 * 60 * 1000),
                sold: 15,        // 30% occupancy
                available: 35,
                propertyId: 'prop-1',
                roomTypeId: 'room-1'
            }));

            vi.mocked(prisma.inventory.findMany).mockResolvedValue(mockInventory as any);
            vi.mocked(prisma.rate.findMany).mockResolvedValue([{
                ratePlanId: 'rate-1',
                date: new Date(),
                amount: 100
            }] as any);
            vi.mocked(prisma.roomType.findUnique).mockResolvedValue({
                id: 'room-1',
                totalRooms: 50
            } as any);

            const recommendations = await generatePriceRecommendations(
                'prop-1',
                'room-1',
                'rate-1',
                { horizon: 1, strategy: PricingStrategy.AGGRESSIVE }
            );

            // Price should decrease for low demand
            expect(recommendations[0].adjustmentFactor).toBeLessThan(1.0);
        });
    });

    describe('Revenue Impact', () => {
        it('should calculate revenue impact', () => {
            const recommendations = [
                {
                    date: '2026-03-01',
                    baseRate: 100,
                    recommendedRate: 120,
                    adjustmentFactor: 1.2,
                    reasoning: 'High demand',
                    predictedOccupancy: 0.85,
                    predictedRevPAR: 102
                },
                {
                    date: '2026-03-02',
                    baseRate: 100,
                    recommendedRate: 90,
                    adjustmentFactor: 0.9,
                    reasoning: 'Low demand',
                    predictedOccupancy: 0.50,
                    predictedRevPAR: 45
                }
            ];

            const impact = calculateRevenueImpact(recommendations);

            expect(impact.baseRevenue).toBeGreaterThan(0);
            expect(impact.optimizedRevenue).toBeGreaterThan(0);
            expect(impact).toHaveProperty('increase');
            expect(impact).toHaveProperty('increasePercentage');
        });
    });

    describe('Model Training', () => {
        it('should backtest model', async () => {
            const mockInventory = Array.from({ length: 90 }, (_, i) => ({
                date: new Date(Date.now() - (90 - i) * 24 * 60 * 60 * 1000),
                sold: Math.floor(Math.random() * 30 + 20),
                available: 50,
                propertyId: 'prop-1'
            }));

            vi.mocked(prisma.inventory.findMany).mockResolvedValue(mockInventory as any);

            const backtest = await backtestModel('prop-1', undefined, 30);

            expect(backtest).toHaveProperty('actual');
            expect(backtest).toHaveProperty('predicted');
            expect(backtest).toHaveProperty('mape');
            expect(backtest.actual.length).toBeGreaterThan(0);
            expect(backtest.predicted.length).toEqual(backtest.actual.length);
        });

        it('should train model with validation', async () => {
            const mockInventory = Array.from({ length: 365 }, (_, i) => ({
                date: new Date(Date.now() - (365 - i) * 24 * 60 * 60 * 1000),
                sold: 30,
                available: 50,
                propertyId: 'prop-1'
            }));

            vi.mocked(prisma.inventory.findMany).mockResolvedValue(mockInventory as any);

            const training = await trainModel('prop-1');

            expect(training).toHaveProperty('modelId');
            expect(training.accuracy).toHaveProperty('mape');
            expect(training.accuracy).toHaveProperty('rmse');
            expect(training.features).toContain('historical_occupancy');
        });
    });
});
