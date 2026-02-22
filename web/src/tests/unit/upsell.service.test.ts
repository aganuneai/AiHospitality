import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { upsellService } from '@/lib/services/monetization/upsell.service';
import { prisma } from '@/lib/db';
import { addDays } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

describe('UpsellService', () => {
    const propertyId = 'test-hotel-upsell';
    const roomTypeIdStandard = 'standard-room-id';
    const roomTypeIdSuite = 'suite-room-id';
    const reservationId = 'res-upsell-1';

    beforeEach(async () => {
        // Setup Property & Rooms
        await prisma.property.create({
            data: { id: propertyId, name: "Upsell Hotel", code: "UPSELL_H" }
        });
        await prisma.roomType.createMany({
            data: [
                { id: roomTypeIdStandard, propertyId, code: "STD", name: "Standard" },
                { id: roomTypeIdSuite, propertyId, code: "SUI", name: "Suite" }
            ]
        });

        // Setup Guest & Reservation
        const guest = await prisma.guestProfile.create({
            data: { fullName: "John Doe" }
        });

        await prisma.reservation.create({
            data: {
                id: reservationId,
                pnr: "PNR_UPSELL",
                propertyId,
                guestId: guest.id,
                status: "CONFIRMED",
                checkIn: new Date(),
                checkOut: addDays(new Date(), 3),
                roomTypeId: roomTypeIdStandard,
                adults: 2,
                ratePlanCode: "BAR", // Added required field
                total: { amount: 300, currency: "USD" }
            }
        });
    });

    afterEach(async () => {
        const deleteOffers = prisma.upsellOffer.deleteMany({});
        const deleteRules = prisma.upsellRule.deleteMany({});
        const deleteReservations = prisma.reservation.deleteMany({});
        const deleteGuests = prisma.guestProfile.deleteMany({});
        const deleteRoomTypes = prisma.roomType.deleteMany({ where: { propertyId } });
        const deleteProperty = prisma.property.deleteMany({ where: { id: propertyId } });

        await prisma.$transaction([
            deleteOffers,
            deleteRules,
            deleteReservations,
            deleteGuests,
            deleteRoomTypes,
            deleteProperty
        ]);
    });

    it('should generate upgrade offers based on rules', async () => {
        // Create Rule: Upgrade STD -> SUI for $50
        await upsellService.createRule({
            code: 'UPG_STD_SUI',
            name: 'Upgrade to Suite',
            propertyId,
            roomTypeFrom: 'STD',
            roomTypeTo: 'SUI',
            priceType: 'FIXED_AMOUNT',
            priceValue: 50.00
        });

        const offers = await upsellService.generateOffers(reservationId);

        expect(offers).toHaveLength(1);
        expect(Number(offers[0].offerPrice)).toBe(50);
        expect(offers[0].status).toBe('PENDING');
    });

    it('should not generate offers if minStay criteria is not met', async () => {
        // Create Rule: Upgrade requires 5 nights
        await upsellService.createRule({
            code: 'UPG_LONG_STAY',
            name: 'Long Stay Upgrade',
            propertyId,
            roomTypeFrom: 'STD',
            roomTypeTo: 'SUI',
            priceType: 'FIXED_AMOUNT',
            priceValue: 40.00,
            minStayNights: 5
        });

        const offers = await upsellService.generateOffers(reservationId); // Reservation is 3 nights

        expect(offers).toHaveLength(0);
    });

    it('should accept an offer and update reservation', async () => {
        // Create Rule & Offer
        const rule = await upsellService.createRule({
            code: 'UPG_STD_SUI_2',
            name: 'Upgrade to Suite',
            propertyId,
            roomTypeFrom: 'STD',
            roomTypeTo: 'SUI',
            priceType: 'FIXED_AMOUNT',
            priceValue: 50.00
        });

        // Generate manually or via service
        const [offer] = await upsellService.generateOffers(reservationId);

        // Accept
        const updatedOffer = await upsellService.acceptOffer(offer.id);

        expect(updatedOffer.status).toBe('ACCEPTED');

        // Verify Reservation Updated
        const res = await prisma.reservation.findUnique({ where: { id: reservationId } });
        expect(res?.roomTypeId).toBe(roomTypeIdSuite);
    });
});
