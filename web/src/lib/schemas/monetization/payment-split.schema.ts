import { z } from 'zod';

export const createSplitSchema = z.object({
    reservationId: z.string(),
    hotelId: z.string().optional(), // Injected by controller from context
    method: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
    payers: z.array(z.object({
        name: z.string(),
        email: z.string().email(),
        amount: z.number().optional(),
        percentage: z.number().optional()
    }))
});

export type CreateSplitInput = z.infer<typeof createSplitSchema>;
