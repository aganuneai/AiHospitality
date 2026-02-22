import { z } from 'zod';
import { differenceInDays, parseISO, isValid } from 'date-fns';

export const bulkUpdateSchema = z.object({
    fromDate: z.string().refine(val => isValid(parseISO(val)), { message: "Invalid fromDate format" }),
    toDate: z.string().refine(val => isValid(parseISO(val)), { message: "Invalid toDate format" }),
    roomTypeIds: z.array(z.string()).min(1, "At least one room type must be selected"),

    overrideManual: z.boolean().default(false),

    // Fields to update. If undefined, do not update.
    fields: z.object({
        price: z.number().positive().optional(),
        available: z.number().min(0).optional(),

        // Restrictions
        minLOS: z.number().min(1).optional().nullable(),
        maxLOS: z.number().min(1).optional().nullable(),
        closedToArrival: z.boolean().optional(),
        closedToDeparture: z.boolean().optional(),
        closed: z.boolean().optional(),
    }).refine(data => Object.values(data).some(val => val !== undefined), {
        message: "At least one field must be provided for update",
    }),
    ratePlanCode: z.string().min(1, "Rate plan is required"),
    daysOfWeek: z.array(z.number().min(0).max(6)).optional()
}).refine(data => {
    const from = parseISO(data.fromDate);
    const to = parseISO(data.toDate);

    if (from > to) return false;

    // 180 days limit
    const diffDays = differenceInDays(to, from);
    return diffDays <= 180;
}, {
    message: "Date range must be valid and cannot exceed 180 days",
    path: ["toDate"]
});

export type BulkUpdateRequest = z.infer<typeof bulkUpdateSchema>;
