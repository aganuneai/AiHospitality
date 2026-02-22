/**
 * Payment Authorization Service
 * 
 * Implements auth/capture pattern for payments:
 * - Authorization: Hold funds at booking
 * - Capture: Charge funds at check-in or later
 * - Void: Release hold if booking cancelled
 * - Refund: Return captured funds
 * 
 * PCI-DSS compliant (uses tokenized cards)
 */

import { prisma } from '../db';
import { logger } from '../logger';
import { getCurrentTenantId } from '../tenancy/tenant-context';

/**
 * Payment status
 */
export type PaymentStatus =
    | 'PENDING'
    | 'AUTHORIZED'
    | 'CAPTURED'
    | 'VOIDED'
    | 'REFUNDED'
    | 'FAILED';

/**
 * Payment authorization
 */
export interface PaymentAuthorization {
    id: string;
    reservationId: string;

    // Amount
    amount: number;
    currency: string;

    // Status
    status: PaymentStatus;

    // Card (tokenized)
    cardToken: string;  // PCI-compliant token
    cardLast4: string;
    cardBrand: string;

    // Authorization details
    authorizationCode?: string;
    authorizedAt?: Date;
    expiresAt?: Date;  // Auths typically expire in 7 days

    // Capture details
    capturedAmount?: number;
    capturedAt?: Date;

    // Void/Refund
    voidedAt?: Date;
    refundedAmount?: number;
    refundedAt?: Date;

    // Metadata
    processorTransactionId?: string;
    failureReason?: string;

    createdAt: Date;
    updatedAt: Date;
}

/**
 * Payment request
 */
export interface PaymentAuthRequest {
    reservationId: string;
    amount: number;
    currency: string;
    cardToken: string;  // From PCI-compliant tokenization
    cardholderName?: string;
}

/**
 * Payment Authorization Service
 */
export class PaymentAuthorizationService {

    /**
     * Authorize payment (hold funds)
     * 
     * This creates an authorization that holds funds on the guest's card
     * without charging them immediately.
     * 
     * @param request - Authorization request
     */
    async authorize(request: PaymentAuthRequest): Promise<PaymentAuthorization> {
        const tenantId = getCurrentTenantId();

        logger.info('Authorizing payment', {
            tenantId,
            reservationId: request.reservationId,
            amount: request.amount,
            currency: request.currency
        });

        // Validate reservation exists
        const reservation = await prisma.reservation.findUnique({
            where: { id: request.reservationId }
        });

        if (!reservation) {
            throw new Error(`Reservation ${request.reservationId} not found`);
        }

        // Call payment processor (mock)
        const authResponse = await this.callPaymentProcessor('authorize', {
            amount: request.amount,
            currency: request.currency,
            cardToken: request.cardToken
        });

        if (!authResponse.success) {
            // Log failure
            await prisma.paymentAuthorization.create({
                data: {
                    reservationId: request.reservationId,
                    amount: request.amount,
                    currency: request.currency,
                    cardToken: request.cardToken,
                    cardLast4: this.extractLast4(request.cardToken),
                    cardBrand: authResponse.cardBrand || 'UNKNOWN',
                    status: 'FAILED',
                    failureReason: authResponse.error
                }
            });

            throw new Error(`Payment authorization failed: ${authResponse.error}`);
        }

        // Authorization successful - create record
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);  // Auth expires in 7 days

        const authorization = await prisma.paymentAuthorization.create({
            data: {
                reservationId: request.reservationId,
                amount: request.amount,
                currency: request.currency,
                cardToken: request.cardToken,
                cardLast4: this.extractLast4(request.cardToken),
                cardBrand: authResponse.cardBrand || 'VISA',
                status: 'AUTHORIZED',
                authorizationCode: authResponse.authCode,
                authorizedAt: new Date(),
                expiresAt,
                processorTransactionId: authResponse.transactionId
            }
        });

        logger.info('Payment authorized successfully', {
            authorizationId: authorization.id,
            authCode: authResponse.authCode,
            expiresAt
        });

        return this.formatAuthorization(authorization);
    }

    /**
     * Capture authorized payment (charge funds)
     * 
     * @param authorizationId - Authorization ID
     * @param amount - Amount to capture (can be partial)
     */
    async capture(authorizationId: string, amount?: number): Promise<PaymentAuthorization> {
        const tenantId = getCurrentTenantId();

        const authorization = await prisma.paymentAuthorization.findUnique({
            where: { id: authorizationId }
        });

        if (!authorization) {
            throw new Error(`Authorization ${authorizationId} not found`);
        }

        // Validate status
        if (authorization.status !== 'AUTHORIZED') {
            throw new Error(`Cannot capture payment with status ${authorization.status}`);
        }

        // Validate not expired
        if (authorization.expiresAt && new Date() > authorization.expiresAt) {
            throw new Error('Authorization has expired');
        }

        // Determine capture amount
        const captureAmount = amount || parseFloat(authorization.amount.toString());
        const authorizedAmount = parseFloat(authorization.amount.toString());

        if (captureAmount > authorizedAmount) {
            throw new Error(`Capture amount (${captureAmount}) exceeds authorized amount (${authorizedAmount})`);
        }

        logger.info('Capturing payment', {
            tenantId,
            authorizationId,
            captureAmount,
            authorizedAmount
        });

        // Call payment processor
        const captureResponse = await this.callPaymentProcessor('capture', {
            authorizationCode: authorization.authorizationCode,
            amount: captureAmount,
            processorTransactionId: authorization.processorTransactionId
        });

        if (!captureResponse.success) {
            throw new Error(`Payment capture failed: ${captureResponse.error}`);
        }

        // Update authorization
        const updated = await prisma.paymentAuthorization.update({
            where: { id: authorizationId },
            data: {
                status: 'CAPTURED',
                capturedAmount: captureAmount,
                capturedAt: new Date()
            }
        });

        logger.info('Payment captured successfully', {
            authorizationId,
            capturedAmount: captureAmount
        });

        return this.formatAuthorization(updated);
    }

    /**
     * Void authorization (release hold)
     * 
     * @param authorizationId - Authorization ID
     */
    async void(authorizationId: string): Promise<PaymentAuthorization> {
        const tenantId = getCurrentTenantId();

        const authorization = await prisma.paymentAuthorization.findUnique({
            where: { id: authorizationId }
        });

        if (!authorization) {
            throw new Error(`Authorization ${authorizationId} not found`);
        }

        // Validate status
        if (authorization.status !== 'AUTHORIZED') {
            throw new Error(`Cannot void payment with status ${authorization.status}`);
        }

        logger.info('Voiding payment authorization', {
            tenantId,
            authorizationId
        });

        // Call payment processor
        const voidResponse = await this.callPaymentProcessor('void', {
            authorizationCode: authorization.authorizationCode,
            processorTransactionId: authorization.processorTransactionId
        });

        if (!voidResponse.success) {
            throw new Error(`Payment void failed: ${voidResponse.error}`);
        }

        // Update authorization
        const updated = await prisma.paymentAuthorization.update({
            where: { id: authorizationId },
            data: {
                status: 'VOIDED',
                voidedAt: new Date()
            }
        });

        logger.info('Payment authorization voided successfully', {
            authorizationId
        });

        return this.formatAuthorization(updated);
    }

    /**
     * Refund captured payment
     * 
     * @param authorizationId - Authorization ID
     * @param amount - Amount to refund (can be partial)
     */
    async refund(authorizationId: string, amount?: number): Promise<PaymentAuthorization> {
        const tenantId = getCurrentTenantId();

        const authorization = await prisma.paymentAuthorization.findUnique({
            where: { id: authorizationId }
        });

        if (!authorization) {
            throw new Error(`Authorization ${authorizationId} not found`);
        }

        // Validate status
        if (authorization.status !== 'CAPTURED') {
            throw new Error(`Cannot refund payment with status ${authorization.status}`);
        }

        // Determine refund amount
        const refundAmount = amount || parseFloat(authorization.capturedAmount?.toString() || '0');
        const capturedAmount = parseFloat(authorization.capturedAmount?.toString() || '0');
        const previouslyRefunded = parseFloat(authorization.refundedAmount?.toString() || '0');
        const availableForRefund = capturedAmount - previouslyRefunded;

        if (refundAmount > availableForRefund) {
            throw new Error(`Refund amount (${refundAmount}) exceeds available amount (${availableForRefund})`);
        }

        logger.info('Refunding payment', {
            tenantId,
            authorizationId,
            refundAmount,
            availableForRefund
        });

        // Call payment processor
        const refundResponse = await this.callPaymentProcessor('refund', {
            processorTransactionId: authorization.processorTransactionId,
            amount: refundAmount
        });

        if (!refundResponse.success) {
            throw new Error(`Payment refund failed: ${refundResponse.error}`);
        }

        // Update authorization
        const totalRefunded = previouslyRefunded + refundAmount;
        const updated = await prisma.paymentAuthorization.update({
            where: { id: authorizationId },
            data: {
                status: totalRefunded >= capturedAmount ? 'REFUNDED' : 'CAPTURED',
                refundedAmount: totalRefunded,
                refundedAt: new Date()
            }
        });

        logger.info('Payment refunded successfully', {
            authorizationId,
            refundedAmount: refundAmount,
            totalRefunded
        });

        return this.formatAuthorization(updated);
    }

    /**
     * Get authorization details
     * 
     * @param authorizationId - Authorization ID
     */
    async getAuthorization(authorizationId: string): Promise<PaymentAuthorization | null> {
        const authorization = await prisma.paymentAuthorization.findUnique({
            where: { id: authorizationId }
        });

        if (!authorization) {
            return null;
        }

        return this.formatAuthorization(authorization);
    }

    /**
     * Get authorizations for reservation
     * 
     * @param reservationId - Reservation ID
     */
    async getReservationAuthorizations(reservationId: string): Promise<PaymentAuthorization[]> {
        const authorizations = await prisma.paymentAuthorization.findMany({
            where: { reservationId },
            orderBy: { createdAt: 'desc' }
        });

        return authorizations.map(auth => this.formatAuthorization(auth));
    }

    /**
     * Format authorization for response
     */
    private formatAuthorization(auth: any): PaymentAuthorization {
        return {
            id: auth.id,
            reservationId: auth.reservationId,
            amount: parseFloat(auth.amount),
            currency: auth.currency,
            status: auth.status,
            cardToken: auth.cardToken,
            cardLast4: auth.cardLast4,
            cardBrand: auth.cardBrand,
            authorizationCode: auth.authorizationCode,
            authorizedAt: auth.authorizedAt,
            expiresAt: auth.expiresAt,
            capturedAmount: auth.capturedAmount ? parseFloat(auth.capturedAmount) : undefined,
            capturedAt: auth.capturedAt,
            voidedAt: auth.voidedAt,
            refundedAmount: auth.refundedAmount ? parseFloat(auth.refundedAmount) : undefined,
            refundedAt: auth.refundedAt,
            processorTransactionId: auth.processorTransactionId,
            failureReason: auth.failureReason,
            createdAt: auth.createdAt,
            updatedAt: auth.updatedAt
        };
    }

    /**
     * Extract last 4 digits from card token
     */
    private extractLast4(cardToken: string): string {
        // In production, this would come from the tokenization service
        return cardToken.slice(-4);
    }

    /**
     * Call payment processor (mock)
     * 
     * In production, this would integrate with Stripe, Adyen, etc.
     */
    private async callPaymentProcessor(
        operation: 'authorize' | 'capture' | 'void' | 'refund',
        data: any
    ): Promise<{
        success: boolean;
        authCode?: string;
        transactionId?: string;
        cardBrand?: string;
        error?: string;
    }> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 100));

        // Mock success (95% success rate)
        const success = Math.random() > 0.05;

        if (success) {
            return {
                success: true,
                authCode: `AUTH${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
                transactionId: `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`,
                cardBrand: 'VISA'
            };
        } else {
            return {
                success: false,
                error: 'Insufficient funds'
            };
        }
    }
}

/**
 * Singleton instance
 */
export const paymentAuthorizationService = new PaymentAuthorizationService();
