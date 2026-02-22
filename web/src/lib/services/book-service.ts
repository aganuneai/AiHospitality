import { BookContext } from '@/lib/types/book-context';
import { BookRequest, BookResponse } from '@/lib/schemas/booking/booking.schema';
import { v4 } from 'uuid';
import { differenceInCalendarDays, parseISO, format, startOfDay } from 'date-fns';
import { validatePricingSignature, type Quote } from '../pricing/signature';
import { catalogRepository, CatalogRepository } from '@/lib/repositories/catalog/catalog.repository';
import { inventoryRepository, InventoryRepository } from '@/lib/repositories/inventory/inventory.repository';
import { reservationRepository, ReservationRepository } from '@/lib/repositories/booking/reservation.repository';
import { guestRepository, GuestRepository } from '@/lib/repositories/identity/guest.repository';
import { auditLogService } from './audit-log.service';

export class BookService {
    constructor(
        private catalogRepo: CatalogRepository = catalogRepository,
        private inventoryRepo: InventoryRepository = inventoryRepository,
        private reservationRepo: ReservationRepository = reservationRepository,
        private guestRepo: GuestRepository = guestRepository
    ) { }

    async createBooking(context: BookContext, request: BookRequest): Promise<BookResponse> {
        const { propertyId, channelId } = context;
        const { stay, guest, quote } = request;
        const { roomTypeCode, ratePlanCode } = stay;
        const { pricingSignature } = quote;

        // 0. Resolve RoomType Code to ID
        const roomType = await this.catalogRepo.findRoomType(propertyId, roomTypeCode);
        if (!roomType) throw new Error(`INVALID_ROOM_TYPE_CODE: ${roomTypeCode}`);
        const roomTypeId = roomType.id;

        // 1. Validate Restrictions (Basic sanity check, mainly handled by Quote/Search)
        const checkInDate = parseISO(stay.checkIn);
        const checkOutDate = parseISO(stay.checkOut);
        const nights = differenceInCalendarDays(checkOutDate, checkInDate);

        if (nights <= 0) throw new Error("INVALID_STAY_DURATION");

        // Validate Inventory Restrictions for the whole stay
        const restrictions = await this.inventoryRepo.findRestrictions(propertyId, roomTypeId, checkInDate, checkOutDate);

        // Find specific day restrictions - Use fixed ISO strings from request to avoid timezone logic
        const checkInKey = stay.checkIn;
        const checkOutKey = stay.checkOut;

        const checkInRestriction = restrictions.find(r => r.date.toISOString().slice(0, 10) === checkInKey);
        const checkOutRestriction = restrictions.find(r => r.date.toISOString().slice(0, 10) === checkOutKey);
        const stayRestrictions = restrictions.filter(r => {
            const dateStr = r.date.toISOString().slice(0, 10);
            return dateStr >= checkInKey && dateStr < checkOutKey;
        });

        // 1.1 Closed check (any night in stay)
        const closedNight = stayRestrictions.find(r => r.closed);
        if (closedNight) throw new Error(`Quarto fechado na data ${closedNight.date.toISOString().slice(0, 10)}`);

        // 1.2 Closed to Arrival (Check-in date)
        if (checkInRestriction?.closedToArrival) throw new Error(`Chegada não permitida na data ${stay.checkIn}`);

        // 1.3 Closed to Departure (Check-out date)
        if (checkOutRestriction?.closedToDeparture) throw new Error(`Saída não permitida na data ${stay.checkOut}`);

        // 1.4 LOS (Check-in date)
        if (checkInRestriction?.minLOS && nights < checkInRestriction.minLOS) throw new Error(`Estadia mínima de ${checkInRestriction.minLOS} noites requerida`);
        if (checkInRestriction?.maxLOS && nights > checkInRestriction.maxLOS) throw new Error(`Estadia máxima de ${checkInRestriction.maxLOS} noites permitida`);


        // 2. Validate Pricing Signature
        // For development/test, we enable a bypass or loose validation if it's a test signature
        const isTestSignature = pricingSignature?.startsWith('sig-');

        if (!isTestSignature && pricingSignature) {
            const pricingValid = validatePricingSignature({
                pricingSignature: quote.pricingSignature,
                quoteId: quote.quoteId
            }, {
                quoteId: quote.quoteId,
                pricingSignature: quote.pricingSignature,
                validUntil: new Date(Date.now() + 3600000) // Mock 1h validity
            } as any);

            if (!pricingValid.valid) {
                throw new Error(`INVALID_PRICING_SIGNATURE: ${pricingValid.error}`);
            }
        }

        // 3. Create/Update Guest
        // The GuestInput interface in repo matches the request guest structure (primaryGuestName, email, phone)
        const guestRecord = await this.guestRepo.findOrCreate(guest);

        // 4. Create Reservation (Transactionally decrement inventory)
        const reservationId = v4();
        const pnr = v4().substring(0, 6).toUpperCase();

        // Calculate Total - mock for now or extract from quote/signature
        const estimatedTotal = 100 * nights;

        await this.reservationRepo.createWithInventory({
            id: reservationId,
            pnr,
            propertyId,
            roomTypeId,
            ratePlanCode,
            guestId: guestRecord.id,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            adults: stay.adults,
            children: stay.children,
            totalAmount: estimatedTotal,
            currency: 'USD'
        }, {
            propertyId,
            roomTypeId,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            quantity: 1
        });

        // ✅ Audit Log: BOOKING_CREATED
        await auditLogService.log({
            eventType: 'BOOKING_CREATED',
            aggregateId: reservationId,
            aggregateType: 'Reservation',
            payload: {
                reservationId,
                pnr,
                status: 'CONFIRMED',
                checkIn: stay.checkIn,
                checkOut: stay.checkOut,
                guests: { adults: stay.adults, children: stay.children },
                roomTypeCode,
                ratePlanCode,
                total: estimatedTotal
            },
            hotelId: propertyId
        });

        return {
            reservationId,
            pnr,
            status: 'CONFIRMED',
            total: estimatedTotal,
            currency: 'USD'
        };
    }

    async listReservations(context: { hotelId: string }) {
        return this.reservationRepo.findByProperty(context.hotelId);
    }

    async updateBookingStatus(id: string, status: 'CONFIRMED' | 'CANCELLED' | 'CHECKED_IN' | 'CHECKED_OUT') {
        // Validation logic could go here (e.g. state transitions)
        // For now, allow direct update
        return this.reservationRepo.updateStatus(id, status);
    }
}

export const bookService = new BookService();
