import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { paymentSplitService } from '@/lib/services/monetization/payment-split.service';
import { prisma } from '@/lib/db';

// Mock Prisma
vi.mock('@/lib/db', () => ({
    prisma: {
        reservation: { findUnique: vi.fn() },
        paymentSplit: { create: vi.fn(), findUnique: vi.fn() },
        paymentAuthorization: { create: vi.fn() },
        $transaction: vi.fn()
    }
}));

describe('PaymentSplitService', () => {
    const reservationId = 'res-split-1';
    const splitId = 'split-1';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should create a valid percentage split', async () => {
        // Mock Reservation
        vi.mocked(prisma.reservation.findUnique).mockResolvedValue({
            id: reservationId,
            total: { amount: 200, currency: "USD" },
            propertyId: 'hotel-123'
        } as any);

        // Mock Create
        vi.mocked(prisma.paymentSplit.create).mockResolvedValue({
            id: 'split-123',
            method: 'PERCENTAGE',
            status: 'PENDING'
        } as any);

        const split = await paymentSplitService.createSplit(reservationId, 'PERCENTAGE', [
            { name: "Payer 1", email: "p1@test.com", percentage: 50 },
            { name: "Payer 2", email: "p2@test.com", percentage: 50 }
        ]);

        expect(split).toBeDefined();
        expect(prisma.paymentSplit.create).toHaveBeenCalled();
    });

    it('should throw error if percentages do not sum to 100', async () => {
        vi.mocked(prisma.reservation.findUnique).mockResolvedValue({
            id: reservationId,
            total: { amount: 200 },
            propertyId: 'hotel-123'
        } as any);

        await expect(paymentSplitService.createSplit(reservationId, 'PERCENTAGE', [
            { name: "Payer 1", email: "p1@test.com", percentage: 40 },
            { name: "Payer 2", email: "p2@test.com", percentage: 40 }
        ])).rejects.toThrow(/percentages must sum to 100/i);
    });

    it('should initiate authorizations for split', async () => {
        vi.mocked(prisma.paymentSplit.findUnique).mockResolvedValue({
            id: splitId,
            reservationId: reservationId,
            method: 'PERCENTAGE',
            payers: [
                { name: "Payer 1", email: "p1@test.com", percentage: 50 },
                { name: "Payer 2", email: "p2@test.com", percentage: 50 }
            ],
            reservation: {
                total: { amount: 200 }
            }
        } as any);

        vi.mocked(prisma.paymentAuthorization.create).mockResolvedValue({ id: 'auth-1' } as any);

        const auths = await paymentSplitService.initiateSplitAuthorization(splitId);

        expect(auths).toHaveLength(2);
        expect(prisma.paymentAuthorization.create).toHaveBeenCalledTimes(2);
    });

    it('should throw error if hotelId context does not match reservation property', async () => {
        vi.mocked(prisma.reservation.findUnique).mockResolvedValue({
            id: reservationId,
            total: { amount: 200 },
            propertyId: 'hotel-REAL'
        } as any);

        await expect(paymentSplitService.createSplit(
            reservationId,
            'PERCENTAGE',
            [{ name: "P1", email: "p1@test.com", percentage: 100 }],
            'hotel-FAKE' // Wrong Hotel ID
        )).rejects.toThrow(/Unauthorized/i);
    });

    it('should succeed if hotelId matches reservation property', async () => {
        vi.mocked(prisma.reservation.findUnique).mockResolvedValue({
            id: reservationId,
            total: { amount: 200 },
            propertyId: 'hotel-REAL'
        } as any);

        vi.mocked(prisma.paymentSplit.create).mockResolvedValue({ id: 'split-1' } as any);

        await paymentSplitService.createSplit(
            reservationId,
            'PERCENTAGE',
            [{ name: "P1", email: "p1@test.com", percentage: 100 }],
            'hotel-REAL' // Correct Hotel ID
        );

        expect(prisma.paymentSplit.create).toHaveBeenCalled();
    });
});
