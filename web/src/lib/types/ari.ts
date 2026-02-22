import { z } from 'zod';

// ARI Event Types
export type AriEventType = 'AVAILABILITY' | 'RATE' | 'RESTRICTION';
export type AriEventStatus = 'PENDING' | 'APPLIED' | 'DEDUPED' | 'ERROR';

// Availability Update
export const AvailabilityUpdateSchema = z.object({
    roomTypeCode: z.string(),
    dateRange: z.object({
        from: z.string().date(),
        to: z.string().date()
    }),
    availability: z.number().int().min(0),
    updateType: z.enum(['SET', 'INCREMENT', 'DECREMENT']).default('SET')
});

export type AvailabilityUpdate = z.infer<typeof AvailabilityUpdateSchema>;

// Rate Update
export const RateUpdateSchema = z.object({
    roomTypeCode: z.string(),
    ratePlanCode: z.string().optional(),
    dateRange: z.object({
        from: z.string().date(),
        to: z.string().date()
    }),
    // Either provide individual rates per date, or a base rate for all
    rates: z.array(z.object({
        date: z.string().date(),
        price: z.number().positive()
    })).optional(),
    baseRate: z.number().positive().optional()
}).refine(data => data.rates || data.baseRate, {
    message: 'Either rates array or baseRate must be provided'
});

export type RateUpdate = z.infer<typeof RateUpdateSchema>;

// Restriction Update
export const RestrictionUpdateSchema = z.object({
    roomTypeCode: z.string(),
    dateRange: z.object({
        from: z.string().date(),
        to: z.string().date()
    }),
    restrictions: z.object({
        minLOS: z.number().int().positive().optional(),
        maxLOS: z.number().int().positive().optional(),
        closedToArrival: z.boolean().optional(),
        closedToDeparture: z.boolean().optional(),
        closed: z.boolean().optional()
    })
});

export type RestrictionUpdate = z.infer<typeof RestrictionUpdateSchema>;

// ARI Event (for async processing)
export const AriEventSchema = z.object({
    eventId: z.string().optional(), // Generated if not provided
    eventType: z.enum(['AVAILABILITY', 'RATE', 'RESTRICTION']),
    occurredAt: z.string().datetime().optional(), // Defaults to now
    roomTypeCode: z.string(),
    ratePlanCode: z.string().optional(),
    dateRange: z.object({
        from: z.string().date(),
        to: z.string().date()
    }),
    payload: z.any() // Flexible payload
});

export type AriEvent = z.infer<typeof AriEventSchema>;

// Calendar Response
export interface AriCalendarDay {
    date: string;
    available: number;
    total: number;
    rate: number | null;
    restrictions: {
        minLOS: number | null;
        maxLOS: number | null;
        closedToArrival: boolean;
        closedToDeparture: boolean;
        closed: boolean;
    };
    isManualOverride: boolean;
}

export interface AriCalendarResponse {
    roomTypeCode: string;
    dateRange: {
        from: string;
        to: string;
    };
    days: AriCalendarDay[];
}

export interface AriGridRateLine {
    ratePlanCode: string;
    ratePlanName: string;
    parentRatePlanId: string | null;
    days: AriCalendarDay[];
}

export interface AriGridRow {
    roomTypeId: string;
    roomTypeCode: string;
    roomTypeName: string;
    inventoryDays: {
        date: string;
        available: number;
        total: number;
    }[];
    rateLines: AriGridRateLine[];
}

export interface AriGridSummary {
    date: string;
    totalInventory: number;
    totalAvailable: number;
    occupancyPct: number;
}

export interface AriGridEvent {
    id: string;
    date: string;
    title: string;
    type: string;
    color: string | null;
    description: string | null;
}

export interface AriGridResponse {
    dateRange: {
        from: string;
        to: string;
    };
    rows: AriGridRow[];
    summary?: AriGridSummary[];
    events?: AriGridEvent[];
}
