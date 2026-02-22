import { z } from 'zod';

export const createUpsellRuleSchema = z.object({
    code: z.string(),
    name: z.string(),
    propertyId: z.string(),
    roomTypeFrom: z.string().optional(),
    roomTypeTo: z.string().optional(),
    serviceId: z.string().optional(),
    priceType: z.enum(['FIXED_AMOUNT', 'PERCENTAGE_DIFF']),
    priceValue: z.number(),
    minStayNights: z.number().optional()
});

export type CreateUpsellRuleInput = z.infer<typeof createUpsellRuleSchema>;
