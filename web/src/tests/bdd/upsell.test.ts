import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UpsellService } from '@/lib/services/monetization/upsell.service';
import { UpsellRepository } from '@/lib/repositories/monetization/upsell.repository';
import { prisma } from '@/lib/db';

// Mock Prisma
vi.mock('@/lib/db', () => ({
    prisma: {
        reservation: { findUnique: vi.fn() },
        $transaction: vi.fn()
    }
}));

// Mock Repository
const mockUpsellRepository = {
    findRulesForRoom: vi.fn(),
    findExistingOffer: vi.fn(),
    createOffer: vi.fn(),
    findOffer: vi.fn()
} as unknown as UpsellRepository;

describe('Feature: Upsell Engine', () => {
    let service: UpsellService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new UpsellService(mockUpsellRepository);
    });

    it('Scenario: Get room upgrade offers', async () => {
        // Given a guest is booking a Standard Room
        const reservationId = 'res-1';
        vi.mocked(prisma.reservation.findUnique).mockResolvedValue({
            id: reservationId,
            propertyId: 'hotel-123',
            roomTypeId: 'rt-001', // ID
            checkIn: new Date('2026-06-10'),
            checkOut: new Date('2026-06-12'),
            roomType: { code: 'STD' } // Code needed for logic
        } as any);

        // And matching rules exist
        vi.mocked(mockUpsellRepository.findRulesForRoom).mockResolvedValue([
            {
                id: 'rule-deluxe',
                roomTypeTo: 'DLX', // Code
                priceType: 'FIXED_AMOUNT',
                priceValue: 140,
                propertyId: 'hotel-123'
            } as any
        ]);

        vi.mocked(mockUpsellRepository.findExistingOffer).mockResolvedValue(null);
        vi.mocked(mockUpsellRepository.createOffer).mockResolvedValue({
            id: 'offer-1',
            ruleId: 'rule-deluxe',
            offerPrice: 140,
            status: 'PENDING'
        } as any);

        // When upsell offers are generated
        const offers = await service.generateOffers(reservationId);

        // Then I should see the room upgrade offers
        expect(offers).toHaveLength(1);
        expect(offers[0].offerPrice).toBe(140);
        expect(mockUpsellRepository.createOffer).toHaveBeenCalledWith(expect.objectContaining({
            offerPrice: 140
        }));
    });

    it('Scenario: Filter offers by minStayNights', async () => {
        // Given rule requires 5 nights
        const reservationId = 'res-short';
        vi.mocked(prisma.reservation.findUnique).mockResolvedValue({
            id: reservationId,
            propertyId: 'hotel-123',
            roomTypeId: 'rt-001',
            checkIn: new Date('2026-06-10'),
            checkOut: new Date('2026-06-12'), // 2 nights
            roomType: { code: 'STD' }
        } as any);

        vi.mocked(mockUpsellRepository.findRulesForRoom).mockResolvedValue([
            {
                id: 'rule-longstay',
                priceValue: 50,
                minStayNights: 5 // Requires 5
            } as any
        ]);

        // When upsell offers are generated
        const offers = await service.generateOffers(reservationId);

        // Then no offers should be returned
        expect(offers).toHaveLength(0);
        expect(mockUpsellRepository.createOffer).not.toHaveBeenCalled();
    });
});
