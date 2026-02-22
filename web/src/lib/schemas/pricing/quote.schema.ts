import { z } from 'zod';
// import { StaySchema } from '../booking/booking.schema'; // Too strict for quoting

export const QuoteRequestSchema = z.object({
    stay: z.object({
        checkIn: z.string(), // ISO or YYYY-MM-DD
        checkOut: z.string(),
    }),
    roomTypeCodes: z.array(z.string()).optional(),
    ratePlanCode: z.string().optional(),
    guests: z.object({
        adults: z.number().int().min(1),
        children: z.number().int().min(0).default(0)
    })
});

export const PriceBreakdownSchema = z.object({
    date: z.string(),
    base: z.number(),
    taxes: z.number(),
    fees: z.number(),
    total: z.number()
});

export const QuoteResultSchema = z.object({
    quoteId: z.string(),
    pricingSignature: z.string(),
    roomTypeCode: z.string(),
    ratePlanCode: z.string(),
    currency: z.string(),
    total: z.number(),
    breakdown: z.array(PriceBreakdownSchema),
    policies: z.object({
        cancellation: z.object({
            type: z.string(),
            penalty: z.number()
        })
    }),
    validUntil: z.date()
});

export type QuoteRequest = z.infer<typeof QuoteRequestSchema>;
export type QuoteResult = z.infer<typeof QuoteResultSchema>;
export type PriceBreakdown = z.infer<typeof PriceBreakdownSchema>;
