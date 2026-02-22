import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { createReservationSchema } from "@/lib/schemas/booking/reservation-create.schema";
import { v4 as uuidv4 } from "uuid";
import { differenceInCalendarDays } from "date-fns";
import { reservationRepository } from "@/lib/repositories/booking/reservation.repository";

// Helper to normalize to UTC Midnight
function toUTCMidnight(d: Date) {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function GET(req: NextRequest) {
    try {
        const propertyId = req.nextUrl.searchParams.get("propertyId") || "HOTEL_001";
        const reservations = await prisma.reservation.findMany({
            where: { propertyId },
            include: { guest: true, roomType: true },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        return NextResponse.json({ bookings: reservations });
    } catch (error: any) {
        console.error("List Bookings Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // 1. Validation
        const validation = createReservationSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { error: "Validation Error", details: validation.error.format() },
                { status: 400 }
            );
        }

        const data = validation.data;
        const propertyId = "HOTEL_001"; // Match the room-types API default (seed data property)
        const groupId = uuidv4();

        // Normalize Dates
        const checkInDate = toUTCMidnight(data.checkIn);
        const checkOutDate = toUTCMidnight(data.checkOut);

        const nights = differenceInCalendarDays(checkOutDate, checkInDate);

        if (nights <= 0) {
            return NextResponse.json({ error: "Invalid dates. Nights must be > 0" }, { status: 400 });
        }

        // 1.1 Quote Validation
        let quotePrice = 0;
        let quoteCurrency = "USD";

        if (data.quoteId) {
            const { getQuoteById } = await import("@/lib/cache/quote-cache");
            const cachedQuote = getQuoteById(data.quoteId);

            if (cachedQuote) {
                // Verify Signature (Integrity Check)
                if (data.pricingSignature && cachedQuote.pricingSignature !== data.pricingSignature) {
                    return NextResponse.json({ error: "Pricing Mismatch. Please re-quote." }, { status: 409 });
                }
                quotePrice = cachedQuote.total;
                quoteCurrency = cachedQuote.currency || "USD";
            } else {
                console.warn(`Quote ${data.quoteId} not found or expired. Falling back to fresh calculation or error.`);
                // For now, if quote is missing, we could error. But for MVP let's allow fallback logic or error.
                // return NextResponse.json({ error: "Quote Expired" }, { status: 400 });
                // Fallback: 150.00 standard rate
                quotePrice = 150.00 * nights;
            }
        } else {
            quotePrice = 150.00 * nights; // Default fallback
        }

        // 2. Transaction
        const result = await prisma.$transaction(async (tx) => {
            // A. Find or Create Guest Profile (The Booker)
            let guestId = "";

            if (data.holderEmail) {
                const existingGuest = await tx.guestProfile.findUnique({
                    where: { email: data.holderEmail }
                });
                if (existingGuest) {
                    guestId = existingGuest.id;
                    // Update phone/doc if needed? Skipped for speed.
                }
            }

            if (!guestId) {
                const newGuest = await tx.guestProfile.create({
                    data: {
                        fullName: data.holderName,
                        email: data.holderEmail || null,
                        phone: data.holderPhone,
                        document: data.holderDoc ? { number: data.holderDoc, type: 'passport' } : Prisma.JsonNull
                    }
                });
                guestId = newGuest.id;
            }

            const createdReservations = [];

            // B. Process Each Room
            // For MVP Admin, one quote usually covers the whole booking (total). 
            // If multi-room, we split the price? Or does the quote cover just one room?
            // QuoteService returns quote PER ROOM TYPE.
            // If data.rooms has multiple rooms, we need to price them individually.
            // Assumption: quoteId provided is for the FIRST room or the logic needs to support multiple.
            // Simplified: Divide total quote price by room count? No, that's dangerous.
            // Better: If we have a quote, we assume it matches the room type. 
            // ADMIN UI currently selects ONE quote for the entire set if they are same type.

            // Fix: We'll assign the full quote price to the first room and 0 to others? No.
            // We will use the quotePrice as "Per Room" if the quote was for 1 room.
            // The QuoteService generates a quote for 1 unit of that room type.
            // So for each room, we apply the quote price.

            for (const room of data.rooms) {
                const reservationId = uuidv4();

                // Resolve roomTypeCode → UUID (frontend sends code e.g. "STD", DB needs UUID)
                const roomTypeRecord = await tx.roomType.findFirst({
                    where: {
                        code: room.roomTypeId, // treat as code
                        propertyId
                    }
                });

                // If exact UUID match exists, use it; otherwise resolve by code
                const roomTypeUUID = roomTypeRecord?.id || room.roomTypeId;

                // If quote is found, use its total. If not, use fallback.
                const finalAmount = quotePrice > 0 ? quotePrice : 150 * nights;

                const res = await reservationRepository.createWithInventory({
                    id: reservationId,
                    pnr: reservationId.substring(0, 8).toUpperCase(),
                    propertyId,
                    guestId,
                    roomTypeId: roomTypeUUID,
                    ratePlanCode: room.ratePlanId,
                    checkIn: checkInDate,
                    checkOut: checkOutDate,
                    adults: room.adults,
                    children: room.children,
                    totalAmount: finalAmount,
                    currency: quoteCurrency,
                    guests: room.guests
                }, {
                    propertyId,
                    roomTypeId: roomTypeUUID,
                    checkIn: checkInDate,
                    checkOut: checkOutDate,
                    quantity: 1
                }, tx);

                // Add quoteId to metadata if needed, or if Reservation model supports it
                // Currently Reservation model has quoteId field.
                await tx.reservation.update({
                    where: { id: reservationId },
                    data: {
                        quoteId: data.quoteId || null,
                        groupId,
                        source: data.source,
                        agencyId: data.agencyId || null,
                        commission: data.commission !== undefined ? new Prisma.Decimal(data.commission) : null
                    }
                });

                createdReservations.push(res);
            }

            return {
                groupId,
                reservations: createdReservations
            };
        });

        return NextResponse.json(result, { status: 201 });

    } catch (error: any) {
        console.error("Booking Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error", message: error.message },
            { status: 500 }
        );
    }
}
