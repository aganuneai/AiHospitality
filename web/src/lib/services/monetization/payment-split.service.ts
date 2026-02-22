import { prisma } from '@/lib/db';

export interface PayerInput {
    name: string;
    email: string;
    amount?: number; // For fixed amount
    percentage?: number; // For percentage
}

export class PaymentSplitService {
    async createSplit(reservationId: string, method: 'PERCENTAGE' | 'FIXED_AMOUNT', payers: PayerInput[], hotelId?: string) {
        const reservation = await prisma.reservation.findUnique({
            where: { id: reservationId }
        });

        if (!reservation) throw new Error("Reservation not found");

        // Validate Context (Anti-IDOR)
        if (hotelId && reservation.propertyId !== hotelId) {
            throw new Error("Unauthorized: Reservation does not belong to the authenticated hotel context");
        }

        // Validate Totals
        const totalAmount = Number((reservation.total as any)?.amount || 0);

        if (method === 'PERCENTAGE') {
            const totalPct = payers.reduce((sum, p) => sum + (p.percentage || 0), 0);
            if (Math.abs(totalPct - 100) > 0.01) throw new Error("Percentages must sum to 100");
        } else if (method === 'FIXED_AMOUNT') {
            const totalFixed = payers.reduce((sum, p) => sum + (p.amount || 0), 0);
            if (Math.abs(totalFixed - totalAmount) > 0.01) throw new Error("Fixed amounts must equal total");
        }

        // Create Split Record
        const split = await prisma.paymentSplit.create({
            data: {
                reservationId,
                method,
                payers: payers as any, // Store details for UI/Notifs
                status: 'PENDING'
            }
        });

        return split;
    }

    async initiateSplitAuthorization(splitId: string) {
        const split = await prisma.paymentSplit.findUnique({
            where: { id: splitId },
            include: { reservation: true }
        });

        if (!split) throw new Error("Split not found");

        const reservationTotal = Number((split.reservation.total as any)?.amount || 0);
        const payers = split.payers as unknown as PayerInput[];
        const authorizations = [];

        for (const payer of payers) {
            let amount = 0;
            if (split.method === 'PERCENTAGE') {
                amount = reservationTotal * ((payer.percentage || 0) / 100);
            } else {
                amount = payer.amount || 0;
            }

            // Create Auth Record (Simulating connection to Gateway)
            const auth = await prisma.paymentAuthorization.create({
                data: {
                    reservationId: split.reservationId,
                    splitId: split.id,
                    amount,
                    currency: 'USD',
                    status: 'PENDING',
                    cardToken: 'tok_simulated', // In real app, comes from frontend tokenization
                    cardLast4: '4242',
                    cardBrand: 'Visa'
                }
            });
            authorizations.push(auth);
        }

        return authorizations;
    }
}

export const paymentSplitService = new PaymentSplitService();
