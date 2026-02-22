import { z } from 'zod';

// --- Shared Components ---

export const DateRangeSchema = z.object({
    from: z.string().date(), // YYYY-MM-DD
    to: z.string().date()
});

// --- Payload Schemas ---

export const AvailabilityPayloadSchema = z.object({
    availability: z.number().int().min(0),
    updateType: z.enum(['SET', 'INCREMENT', 'DECREMENT']).default('SET')
});

export const RatePayloadSchema = z.object({
    // Either provide individual rates per date, or a base rate for all
    rates: z.array(z.object({
        date: z.string().date(),
        price: z.number().positive()
    })).optional(),
    baseRate: z.number().positive().optional()
}).refine(data => data.rates || data.baseRate, {
    message: 'Either rates array or baseRate must be provided'
});

export const RestrictionPayloadSchema = z.object({
    minLOS: z.number().int().positive().optional(),
    maxLOS: z.number().int().positive().optional(),
    closedToArrival: z.boolean().optional(),
    closedToDeparture: z.boolean().optional(),
    closed: z.boolean().optional()
});

// --- Discriminated Union Event Schema ---

const BaseAriEventSchema = z.object({
    eventId: z.string().optional(), // Generated if not provided
    occurredAt: z.string().datetime().optional(), // Defaults to now
    roomTypeCode: z.string().min(1),
    ratePlanCode: z.string().optional(), // Optional for Availability, required for Rates usually
    dateRange: DateRangeSchema
});

export const AvailabilityEventSchema = BaseAriEventSchema.extend({
    eventType: z.literal('AVAILABILITY'),
    payload: AvailabilityPayloadSchema
});

export const RateEventSchema = BaseAriEventSchema.extend({
    eventType: z.literal('RATE'),
    ratePlanCode: z.string().min(1), // Required for rates
    payload: RatePayloadSchema
});

export const RestrictionEventSchema = BaseAriEventSchema.extend({
    eventType: z.literal('RESTRICTION'),
    ratePlanCode: z.string().optional(), // Can be room-level or rate-level
    payload: RestrictionPayloadSchema
});

// The Master Schema
export const AriEventSchema = z.discriminatedUnion('eventType', [
    AvailabilityEventSchema,
    RateEventSchema,
    RestrictionEventSchema
]);

// --- Types ---

export type AvailabilityPayload = z.infer<typeof AvailabilityPayloadSchema>;
export type RatePayload = z.infer<typeof RatePayloadSchema>;
export type RestrictionPayload = z.infer<typeof RestrictionPayloadSchema>;

export type AvailabilityEvent = z.infer<typeof AvailabilityEventSchema>;
export type RateEvent = z.infer<typeof RateEventSchema>;
export type RestrictionEvent = z.infer<typeof RestrictionEventSchema>;

export type AriEvent = z.infer<typeof AriEventSchema>;
