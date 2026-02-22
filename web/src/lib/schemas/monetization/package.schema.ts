import { z } from 'zod';

export const createPackageSchema = z.object({
    code: z.string(),
    name: z.string(),
    description: z.string().optional(),
    propertyId: z.string(),
    roomTypeId: z.string(),
    basePrice: z.number(),
    discountPct: z.number().min(0).max(100),
    validFrom: z.string().transform((str) => new Date(str)),
    validUntil: z.string().transform((str) => new Date(str)),
    minStayNights: z.number().optional(),
    items: z.array(z.object({
        name: z.string(),
        type: z.enum(['SERVICE', 'PRODUCT', 'EXPERIENCE']),
        unitPrice: z.number(),
        quantity: z.number().optional(),
        postingPattern: z.enum(['DAILY', 'ON_ARRIVAL', 'ON_DEPARTURE']).optional()
    }))
});

export type CreatePackageInput = z.infer<typeof createPackageSchema>;
