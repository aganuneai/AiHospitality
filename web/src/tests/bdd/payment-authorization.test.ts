import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PaymentService } from '@/lib/services/monetization/payment.service';
import { prisma } from '@/lib/db';
import { addDays } from 'date-fns';

// Mock Prisma
vi.mock('@/lib/db', () => ({
    prisma: {
        paymentAuthorization: {
            create: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn()
        }
    }
}));

describe('Feature: Payment Authorization (Auth/Capture)', () => {
    let service: PaymentService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new PaymentService();
    });

    it('Scenario: Authorize payment at booking', async () => {
        // Given I am processing a new booking
        const input = {
            reservationId: 'res-001',
            amount: 450,
            cardToken: 'tok_visa_1234'
        };

        vi.mocked(prisma.paymentAuthorization.create).mockResolvedValue({
            id: 'auth-1',
            status: 'AUTHORIZED',
            amount: 450,
            authorizationCode: 'AUTH123'
        } as any);

        // When I authorize payment
        const result = await service.authorize(input.reservationId, input.amount, input.cardToken);

        // Then the authorization should succeed
        expect(result.status).toBe('AUTHORIZED');
        expect(result.authorizationCode).toBeDefined();
    });

    it('Scenario: Capture full payment at check-in', async () => {
        // Given a payment of $450 is authorized
        vi.mocked(prisma.paymentAuthorization.findUnique).mockResolvedValue({
            id: 'auth-1',
            status: 'AUTHORIZED',
            amount: 450,
            expiresAt: addDays(new Date(), 7)
        } as any);

        vi.mocked(prisma.paymentAuthorization.update).mockResolvedValue({
            id: 'auth-1',
            status: 'CAPTURED',
            capturedAmount: 450
        } as any);

        // When I capture the full amount
        const result = await service.capture('auth-1');

        // Then the capture should succeed
        expect(result.status).toBe('CAPTURED');
        expect(Number(result.capturedAmount)).toBe(450);
    });

    it('Scenario: Capture amount cannot exceed authorized amount', async () => {
        // Given a payment of $450 is authorized
        vi.mocked(prisma.paymentAuthorization.findUnique).mockResolvedValue({
            id: 'auth-1',
            status: 'AUTHORIZED',
            amount: 450,
            expiresAt: addDays(new Date(), 7)
        } as any);

        // When I attempt to capture $500
        // Then the capture should fail
        await expect(service.capture('auth-1', 500)).rejects.toThrow(/exceeds authorized amount/);
    });

    it('Scenario: Cannot capture after voiding', async () => {
        // Given authorization is voided
        vi.mocked(prisma.paymentAuthorization.findUnique).mockResolvedValue({
            id: 'auth-voided',
            status: 'VOIDED',
            amount: 450
        } as any);

        // When I attempt to capture
        await expect(service.capture('auth-voided')).rejects.toThrow(/Cannot capture payment with status VOIDED/);
    });

    it('Scenario: Partial refund for service issues', async () => {
        // Given a payment of $450 is captured
        vi.mocked(prisma.paymentAuthorization.findUnique).mockResolvedValue({
            id: 'auth-captured',
            status: 'CAPTURED',
            amount: 450,
            capturedAmount: 450,
            refundedAmount: 0
        } as any);

        vi.mocked(prisma.paymentAuthorization.update).mockResolvedValue({
            id: 'auth-captured',
            status: 'CAPTURED',
            refundedAmount: 100
        } as any);

        // When I issue a partial refund of $100
        const result = await service.refund('auth-captured', 100);

        // Then refund succeeds
        expect(Number(result.refundedAmount)).toBe(100);
    });

    it('Scenario: Authorization expires after 7 days', async () => {
        // Given expired auth
        vi.mocked(prisma.paymentAuthorization.findUnique).mockResolvedValue({
            id: 'auth-expired',
            status: 'AUTHORIZED',
            expiresAt: addDays(new Date(), -1) // Yesterday
        } as any);

        // When attempt capture
        await expect(service.capture('auth-expired')).rejects.toThrow(/Authorization has expired/);
    });
});
