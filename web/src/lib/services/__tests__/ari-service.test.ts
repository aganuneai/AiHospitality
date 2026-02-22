import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseISO } from 'date-fns';
import { ariService } from '../ari-service';
import { prisma } from '@/lib/db';

// Mock Prisma
vi.mock('@/lib/db', () => ({
    prisma: {
        roomType: {
            findMany: vi.fn(),
        },
        inventory: {
            findMany: vi.fn(),
            createMany: vi.fn(),
            updateMany: vi.fn(),
        },
        restriction: {
            findMany: vi.fn(),
            createMany: vi.fn(),
            updateMany: vi.fn(),
        },
        $transaction: vi.fn((callback) => callback(prisma)),
    }
}));

describe('AriService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('updateBulk', () => {
        it('should execute bulk updates inside a transaction', async () => {
            const hotelId = 'prop-123';
            const params = {
                fromDate: '2026-03-01',
                toDate: '2026-03-05',
                roomTypeIds: ['rt-1', 'rt-2'],
                overrideManual: true,
                fields: {
                    price: 150,
                    available: 5,
                    closedToArrival: true
                }
            };

            const result = await ariService.updateBulk(hotelId, params as any);

            expect(result.message).toBe('Bulk update applied successfully');

            // Verify transaction was called
            expect(prisma.$transaction).toHaveBeenCalled();

            // Verify createMany (Upsert setup) was called for Inventory and Restriction
            expect(prisma.inventory.createMany).toHaveBeenCalled();
            expect(prisma.restriction.createMany).toHaveBeenCalled();

            // Verify updateMany was called with correct fields
            expect(prisma.inventory.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        price: 150,
                        available: 5
                    })
                })
            );

            expect(prisma.restriction.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        closedToArrival: true
                    })
                })
            );
        });

        it('should correctly configure date ranges', async () => {
            const hotelId = 'prop-123';
            const params = {
                fromDate: '2026-03-01',
                toDate: '2026-03-02',
                roomTypeIds: ['rt-1'],
                overrideManual: false,
                fields: {
                    minLOS: 3
                }
            };

            await ariService.updateBulk(hotelId, params as any);

            // It generates dates for both start and end dates (inclusive bounds)
            expect(prisma.restriction.createMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.arrayContaining([
                        expect.objectContaining({ date: parseISO('2026-03-01') }),
                        expect.objectContaining({ date: parseISO('2026-03-02') })
                    ])
                })
            );
        });
    });
});
