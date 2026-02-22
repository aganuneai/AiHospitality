import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RestrictionEngine } from './engine';
import { RestrictionError } from './types';

// Mock Prisma
vi.mock('../db', () => ({
    prisma: {
        roomType: {
            findUnique: vi.fn()
        },
        restriction: {
            findMany: vi.fn(),
            findFirst: vi.fn()
        }
    }
}));

import { prisma } from '../db';

describe('RestrictionEngine', () => {
    let engine: RestrictionEngine;

    beforeEach(() => {
        engine = new RestrictionEngine();
        vi.clearAllMocks();
    });

    describe('validateQuote', () => {
        const mockRoomType = {
            id: 'RT-001',
            code: 'DLX',
            name: 'Deluxe Room',
            propertyId: 'H-001'
        };

        beforeEach(() => {
            vi.mocked(prisma.roomType.findUnique).mockResolvedValue(mockRoomType as any);
        });

        it('should pass when no restrictions exist', async () => {
            vi.mocked(prisma.restriction.findMany).mockResolvedValue([]);

            const result = await engine.validateQuote({
                propertyId: 'H-001',
                roomTypeCode: 'DLX',
                ratePlanCode: 'BAR',
                checkIn: new Date('2026-03-10'),
                checkOut: new Date('2026-03-13')
            });

            expect(result.valid).toBe(true);
        });

        it('should fail when room is closed', async () => {
            vi.mocked(prisma.restriction.findMany).mockResolvedValue([
                {
                    id: '1',
                    propertyId: 'H-001',
                    roomTypeId: 'RT-001',
                    date: new Date('2026-03-11'),
                    closedToArrival: false,
                    closedToDeparture: false,
                    minLos: null,
                    maxLos: null,
                    stopSell: false,
                    closed: true,  // CLOSED!
                    createdAt: new Date(),
                    updatedAt: new Date()
                } as any
            ]);

            const result = await engine.validateQuote({
                propertyId: 'H-001',
                roomTypeCode: 'DLX',
                ratePlanCode: 'BAR',
                checkIn: new Date('2026-03-10'),
                checkOut: new Date('2026-03-13')
            });

            expect(result.valid).toBe(false);
            expect(result.error).toBe(RestrictionError.ROOM_CLOSED);
        });

        it('should fail when stop-sell is active', async () => {
            vi.mocked(prisma.restriction.findMany).mockResolvedValue([
                {
                    id: '1',
                    propertyId: 'H-001',
                    roomTypeId: 'RT-001',
                    date: new Date('2026-04-15'),
                    closedToArrival: false,
                    closedToDeparture: false,
                    minLos: null,
                    maxLos: null,
                    stopSell: true,  // STOP SELL!
                    closed: false,
                    createdAt: new Date(),
                    updatedAt: new Date()
                } as any
            ]);

            const result = await engine.validateQuote({
                propertyId: 'H-001',
                roomTypeCode: 'DLX',
                ratePlanCode: 'BAR',
                checkIn: new Date('2026-04-15'),
                checkOut: new Date('2026-04-17')
            });

            expect(result.valid).toBe(false);
            expect(result.error).toBe(RestrictionError.STOP_SELL);
        });

        it('should fail when Min LOS is violated', async () => {
            vi.mocked(prisma.restriction.findMany).mockResolvedValue([
                {
                    id: '1',
                    propertyId: 'H-001',
                    roomTypeId: 'RT-001',
                    date: new Date('2026-05-10'),
                    closedToArrival: false,
                    closedToDeparture: false,
                    minLos: 5,  // Min 5 nights
                    maxLos: null,
                    stopSell: false,
                    closed: false,
                    createdAt: new Date(),
                    updatedAt: new Date()
                } as any
            ]);

            // Only 3 nights requested
            const result = await engine.validateQuote({
                propertyId: 'H-001',
                roomTypeCode: 'DLX',
                ratePlanCode: 'BAR',
                checkIn: new Date('2026-05-10'),
                checkOut: new Date('2026-05-13')
            });

            expect(result.valid).toBe(false);
            expect(result.error).toBe(RestrictionError.MIN_LOS_VIOLATION);
        });

        it('should use highest Min LOS from multiple restrictions', async () => {
            vi.mocked(prisma.restriction.findMany).mockResolvedValue([
                {
                    id: '1',
                    propertyId: 'H-001',
                    roomTypeId: 'RT-001',
                    date: new Date('2026-06-10'),
                    minLos: 2,
                    maxLos: null,
                    closedToArrival: false,
                    closedToDeparture: false,
                    stopSell: false,
                    closed: false,
                    createdAt: new Date(),
                    updatedAt: new Date()
                } as any,
                {
                    id: '2',
                    propertyId: 'H-001',
                    roomTypeId: 'RT-001',
                    date: new Date('2026-06-11'),
                    minLos: 5,  // Highest!
                    maxLos: null,
                    closedToArrival: false,
                    closedToDeparture: false,
                    stopSell: false,
                    closed: false,
                    createdAt: new Date(),
                    updatedAt: new Date()
                } as any
            ]);

            // Only 3 nights
            const result = await engine.validateQuote({
                propertyId: 'H-001',
                roomTypeCode: 'DLX',
                ratePlanCode: 'BAR',
                checkIn: new Date('2026-06-10'),
                checkOut: new Date('2026-06-13')
            });

            expect(result.valid).toBe(false);
            expect(result.error).toBe(RestrictionError.MIN_LOS_VIOLATION);
        });
    });

    describe('hasRestriction', () => {
        it('should return true when restriction exists', async () => {
            vi.mocked(prisma.roomType.findUnique).mockResolvedValue({
                id: 'RT-001',
                code: 'STD'
            } as any);

            vi.mocked(prisma.restriction.findFirst).mockResolvedValue({
                id: '1',
                closed: true
            } as any);

            const result = await engine.hasRestriction(
                'H-001',
                'STD',
                new Date('2026-07-15'),
                'closed'
            );

            expect(result).toBe(true);
        });

        it('should return false when restriction does not exist', async () => {
            vi.mocked(prisma.roomType.findUnique).mockResolvedValue({
                id: 'RT-001',
                code: 'STD'
            } as any);

            vi.mocked(prisma.restriction.findFirst).mockResolvedValue(null);

            const result = await engine.hasRestriction(
                'H-001',
                'STD',
                new Date('2026-07-15'),
                'stopSell'
            );

            expect(result).toBe(false);
        });
    });
});
