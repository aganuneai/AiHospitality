import { z } from 'zod';

// --- Shared Schemas ---

export const GuestSchema = z.object({
    primaryGuestName: z.string().min(1, "Primary guest name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().optional(),
});

export const StaySchema = z.object({
    checkIn: z.string().date(), // YYYY-MM-DD
    checkOut: z.string().date(),
    adults: z.number().int().positive(),
    children: z.number().int().nonnegative().default(0),
    roomTypeCode: z.string().min(1),
    ratePlanCode: z.string().min(1)
});

export const QuoteContextSchema = z.object({
    quoteId: z.string().min(1),
    pricingSignature: z.string().min(1),
});

export const BookingContextSchema = z.object({
    domain: z.enum(['PROPERTY', 'DISTRIBUTION']),
    hotelId: z.string().optional(),
    hubId: z.string().optional(),
    channelCode: z.string().optional(),
    requestId: z.string().min(1),
}).refine((data) => {
    // XOR validation for hotelId vs hubId
    return (!!data.hotelId && !data.hubId) || (!data.hotelId && !!data.hubId);
}, { message: "Must provide either hotelId OR hubId, not both." });

export const PaymentSchema = z.object({
    method: z.enum(['CARD', 'CASH', 'AGENCY']),
    token: z.string().optional(),
    amount: z.number().optional(),
    currency: z.string().optional()
}).optional();

// --- Main Request Schema ---

export const BookRequestSchema = z.object({
    context: BookingContextSchema,
    idempotencyKey: z.string().min(1, "Idempotency key is required"),
    quote: QuoteContextSchema,
    guest: GuestSchema,
    stay: StaySchema,
    payment: PaymentSchema,
    // comments/specialRequests could be added here
});


export const BookResponseSchema = z.object({
    reservationId: z.string(),
    pnr: z.string(),
    status: z.string(),
    total: z.number(),
    currency: z.string()
});

export type Guest = z.infer<typeof GuestSchema>;
export type Stay = z.infer<typeof StaySchema>;
export type BookRequest = z.infer<typeof BookRequestSchema>;
export type BookResponse = z.infer<typeof BookResponseSchema>;
