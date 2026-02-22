import { describe, it, expect } from 'vitest';
import { BookService } from '@/lib/services/book-service';
import { prisma } from '@/lib/db';
import { startOfDay } from 'date-fns';

describe('BookService - Restriction Enforcement', () => {

    async function setupTest(testId: string) {
        const hotelId = `hotel-${testId}-${Date.now()}`;
        const roomTypeCode = 'DELUXE';

        await prisma.property.create({ data: { id: hotelId, code: hotelId, name: 'Test' } });
        const roomType = await prisma.roomType.create({ data: { propertyId: hotelId, code: roomTypeCode, name: 'Deluxe' } });

        // Inventory for 7 days starting 2026-06-01
        for (let i = 1; i <= 7; i++) {
            const day = i < 10 ? `0${i}` : i;
            await prisma.inventory.create({
                data: {
                    propertyId: hotelId,
                    roomTypeId: roomType.id,
                    date: new Date(`2026-06-${day}T00:00:00Z`),
                    total: 10, available: 10, booked: 0, price: 100
                }
            });
        }
        return { hotelId, roomTypeId: roomType.id, roomTypeCode };
    }

    const createRequest = (roomTypeCode: string, checkIn: string, checkOut: string) => ({
        stay: { checkIn, checkOut, adults: 2, children: 0, roomTypeCode, ratePlanCode: 'BAR' },
        guest: { primaryGuestName: 'Test', email: `t-${Math.random()}@e.com` },
        quote: { quoteId: 'q', pricingSignature: 'sig-test' }
    });

    it('should reject booking when date is CLOSED', async () => {
        const { hotelId, roomTypeId, roomTypeCode } = await setupTest('closed');
        await prisma.restriction.create({
            data: { propertyId: hotelId, roomTypeId, date: new Date('2026-06-02T00:00:00Z'), closed: true }
        });

        const req = createRequest(roomTypeCode, '2026-06-01', '2026-06-03'); // Stay covers 01 and 02
        await expect(new BookService().createBooking({ propertyId: hotelId }, req as any))
            .rejects.toThrow(/fechad|closed/i);
    });

    it('should reject booking when check-in is CLOSED_TO_ARRIVAL', async () => {
        const { hotelId, roomTypeId, roomTypeCode } = await setupTest('cta');
        await prisma.restriction.create({
            data: { propertyId: hotelId, roomTypeId, date: new Date('2026-06-01T00:00:00Z'), closedToArrival: true }
        });

        const req = createRequest(roomTypeCode, '2026-06-01', '2026-06-03');
        await expect(new BookService().createBooking({ propertyId: hotelId }, req as any))
            .rejects.toThrow(/chegada|arrival/i);
    });

    it('should reject booking when check-out is CLOSED_TO_DEPARTURE', async () => {
        const { hotelId, roomTypeId, roomTypeCode } = await setupTest('ctd');
        await prisma.restriction.create({
            data: { propertyId: hotelId, roomTypeId, date: new Date('2026-06-03T00:00:00Z'), closedToDeparture: true }
        });

        const req = createRequest(roomTypeCode, '2026-06-01', '2026-06-03');
        await expect(new BookService().createBooking({ propertyId: hotelId }, req as any))
            .rejects.toThrow(/saída|departure/i);
    });

    it('should reject booking when stay is less than MIN_LOS', async () => {
        const { hotelId, roomTypeId, roomTypeCode } = await setupTest('minlos');
        await prisma.restriction.create({
            data: { propertyId: hotelId, roomTypeId, date: new Date('2026-06-01T00:00:00Z'), minLOS: 3 }
        });

        const req = createRequest(roomTypeCode, '2026-06-01', '2026-06-02'); // 1 night
        await expect(new BookService().createBooking({ propertyId: hotelId }, req as any))
            .rejects.toThrow(/mínim|minimum/i);
    });

    it('should reject booking when stay exceeds MAX_LOS', async () => {
        const { hotelId, roomTypeId, roomTypeCode } = await setupTest('maxlos');
        await prisma.restriction.create({
            data: { propertyId: hotelId, roomTypeId, date: new Date('2026-06-01T00:00:00Z'), maxLOS: 2 }
        });

        const req = createRequest(roomTypeCode, '2026-06-01', '2026-06-05'); // 4 nights
        await expect(new BookService().createBooking({ propertyId: hotelId }, req as any))
            .rejects.toThrow(/máxim|maximum/i);
    });

    it('should allow booking when all restrictions are satisfied', async () => {
        const { hotelId, roomTypeCode } = await setupTest('ok');
        const req = createRequest(roomTypeCode, '2026-06-01', '2026-06-03');
        const res = await new BookService().createBooking({ propertyId: hotelId }, req as any);
        expect(res.status).toBe('CONFIRMED');
        expect(res.reservationId).toBeDefined();
    });
});
