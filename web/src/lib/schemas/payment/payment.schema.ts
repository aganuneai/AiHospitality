
import { z } from 'zod';

// Luhn Algorithm for Credit Card validation
const luhnCheck = (cardNumber: string) => {
    let sum = 0;
    let shouldDouble = false;
    // loop through values starting at the rightmost side
    for (let i = cardNumber.length - 1; i >= 0; i--) {
        let digit = parseInt(cardNumber.charAt(i));

        if (shouldDouble) {
            if ((digit *= 2) > 9) digit -= 9;
        }

        sum += digit;
        shouldDouble = !shouldDouble;
    }
    return (sum % 10) === 0;
};

export const PaymentMethodTypeSchema = z.enum(['CREDIT_CARD', 'CASH', 'TRANSFER']);

export const CreditCardSchema = z.object({
    holderName: z.string().min(2, "Name on card is too short"),
    number: z.string().regex(/^\d{13,19}$/, "Invalid card number length").refine(luhnCheck, "Invalid card number checksum"),
    expiry: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Invalid expiry (MM/YY)"),
    cvc: z.string().regex(/^\d{3,4}$/, "Invalid CVC")
});

export const PaymentRequestSchema = z.object({
    method: PaymentMethodTypeSchema,
    amount: z.number().positive(),
    currency: z.string().default('USD'),
    card: CreditCardSchema.optional(), // Required if method is CREDIT_CARD
    reference: z.string().optional() // For Transfer/Cash
}).refine(data => {
    if (data.method === 'CREDIT_CARD' && !data.card) return false;
    return true;
}, {
    message: "Card details are required for Credit Card payment",
    path: ["card"]
});

export type PaymentMethodType = z.infer<typeof PaymentMethodTypeSchema>;
export type CreditCard = z.infer<typeof CreditCardSchema>;
export type PaymentRequest = z.infer<typeof PaymentRequestSchema>;
