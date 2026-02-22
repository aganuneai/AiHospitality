import { prisma } from '@/lib/db';

export class PaymentService {

    // Authorize (Mock Gateway)
    async authorize(reservationId: string, amount: number, cardToken: string) {
        // In real world, call Stripe/Adyen here
        const isSuccess = cardToken !== 'tok_fail';

        if (!isSuccess) {
            await prisma.paymentAuthorization.create({
                data: {
                    reservationId,
                    amount,
                    status: 'FAILED',
                    cardToken,
                    cardLast4: '0000',
                    cardBrand: 'Unknown',
                    failureReason: 'Insufficient funds'
                }
            });
            throw new Error("Authorization failed: Insufficient funds");
        }

        return prisma.paymentAuthorization.create({
            data: {
                reservationId,
                amount,
                status: 'AUTHORIZED',
                cardToken,
                cardLast4: '4242', // Mock
                cardBrand: 'Visa', // Mock
                authorizationCode: 'AUTH' + Math.random().toString(36).substring(7).toUpperCase(),
                authorizedAt: new Date(),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
            }
        });
    }

    // Capture
    async capture(authId: string, amount?: number) {
        const auth = await prisma.paymentAuthorization.findUnique({ where: { id: authId } });
        if (!auth) throw new Error("Authorization not found");

        if (auth.status === 'VOIDED') throw new Error("Cannot capture payment with status VOIDED");
        if (auth.status === 'CAPTURED') throw new Error("Payment already captured"); // Simplification

        // Check Expiry
        if (auth.expiresAt && new Date() > auth.expiresAt) {
            throw new Error("Authorization has expired");
        }

        const captureAmount = amount || Number(auth.amount);
        if (captureAmount > Number(auth.amount)) {
            throw new Error(`Capture amount ($${captureAmount}) exceeds authorized amount ($${auth.amount})`);
        }

        return prisma.paymentAuthorization.update({
            where: { id: authId },
            data: {
                status: 'CAPTURED',
                capturedAmount: captureAmount,
                capturedAt: new Date()
            }
        });
    }

    // Void
    async voidAuthorization(authId: string) {
        const auth = await prisma.paymentAuthorization.findUnique({ where: { id: authId } });
        if (!auth) throw new Error("Authorization not found");

        if (auth.status === 'CAPTURED') throw new Error("Cannot void captured payment");

        return prisma.paymentAuthorization.update({
            where: { id: authId },
            data: {
                status: 'VOIDED',
                voidedAt: new Date()
            }
        });
    }

    // Refund
    async refund(authId: string, amount?: number) {
        const auth = await prisma.paymentAuthorization.findUnique({ where: { id: authId } });
        if (!auth) throw new Error("Authorization not found");

        if (auth.status !== 'CAPTURED' && auth.status !== 'REFUNDED') throw new Error("Payment not captured");

        const refundAmount = amount || Number(auth.capturedAmount);
        // Simple check: assume total refunded + new refund <= captured
        // Schema only has 'refundedAmount' as total.
        const currentRefunded = Number(auth.refundedAmount || 0);
        const captured = Number(auth.capturedAmount || 0);

        if (currentRefunded + refundAmount > captured) {
            throw new Error(`Refund amount ($${refundAmount}) exceeds available amount ($${captured - currentRefunded})`);
        }

        const newStatus = (currentRefunded + refundAmount === captured) ? 'REFUNDED' : 'CAPTURED'; // or PARTIAL_REFUND

        return prisma.paymentAuthorization.update({
            where: { id: authId },
            data: {
                status: newStatus,
                refundedAmount: currentRefunded + refundAmount,
                refundedAt: new Date()
            }
        });
    }
}

export const paymentService = new PaymentService();
