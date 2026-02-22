/**
 * PCI-DSS Compliance
 * 
 * Payment Card Industry Data Security Standard compliance:
 * - Never store CVV/CVC
 * - Tokenize card numbers
 * - Encrypt sensitive data
 * - Audit all access to payment data
 */

import crypto from 'crypto';
import { prisma } from '../db';
import { logger } from '../logger';

/**
 * Payment card data (PCI-DSS compliant)
 * 
 * NEVER store:
 * - Full PAN (Primary Account Number) in plain text
 * - CVV/CVC/CVV2
 * - PIN
 */
export interface PaymentCard {
    token: string;           // Tokenized card (safe to store)
    lastFour: string;        // Last 4 digits (safe to display)
    brand: string;           // VISA, MASTERCARD, etc.
    expiryMonth: number;
    expiryYear: number;
    cardholderName: string;
}

/**
 * Encryption key (in production, use KMS like AWS KMS, Azure Key Vault)
 */
const ENCRYPTION_KEY = process.env.PAYMENT_ENCRYPTION_KEY || 'change-me-in-production-32-chars';

/**
 * Tokenize card number
 * 
 * Replaces full PAN with irreversible token.
 * Only last 4 digits are stored for display.
 * 
 * @param cardNumber - Full card number
 * @returns Token
 */
export function tokenizeCardNumber(cardNumber: string): string {
    // Remove spaces and dashes
    const sanitized = cardNumber.replace(/[\s-]/g, '');

    // Validate card number (Luhn algorithm)
    if (!isValidCardNumber(sanitized)) {
        throw new Error('Invalid card number');
    }

    // Generate SHA-256 token (irreversible)
    const token = crypto
        .createHash('sha256')
        .update(sanitized + process.env.TOKEN_SALT || 'salt')
        .digest('hex');

    return `tok_${token.substring(0, 32)}`;
}

/**
 * Get last 4 digits
 * 
 * @param cardNumber - Full card number
 * @returns Last 4 digits
 */
export function getLastFour(cardNumber: string): string {
    const sanitized = cardNumber.replace(/[\s-]/g, '');
    return sanitized.slice(-4);
}

/**
 * Validate card number using Luhn algorithm
 * 
 * @param cardNumber - Card number
 * @returns True if valid
 */
function isValidCardNumber(cardNumber: string): boolean {
    if (!/^\d{13,19}$/.test(cardNumber)) return false;

    let sum = 0;
    let isEven = false;

    for (let i = cardNumber.length - 1; i >= 0; i--) {
        let digit = parseInt(cardNumber[i]);

        if (isEven) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }

        sum += digit;
        isEven = !isEven;
    }

    return sum % 10 === 0;
}

/**
 * Encrypt sensitive data (AES-256-GCM)
 * 
 * Used for data at rest encryption.
 * 
 * @param data - Plain text
 * @returns Encrypted data with IV
 */
export function encryptData(data: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
        'aes-256-gcm',
        Buffer.from(ENCRYPTION_KEY.substring(0, 32)),
        iv
    );

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Combine IV + authTag + encrypted data
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt sensitive data
 * 
 * @param encryptedData - Encrypted data with IV
 * @returns Plain text
 */
export function decryptData(encryptedData: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        Buffer.from(ENCRYPTION_KEY.substring(0, 32)),
        iv
    );

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * Process payment (PCI-DSS compliant)
 * 
 * @param cardData - Card data
 * @param amount - Payment amount
 * @returns Payment result
 */
export async function processPayment(
    cardData: {
        cardNumber: string;
        cvv: string;  // NEVER stored
        expiryMonth: number;
        expiryYear: number;
        cardholderName: string;
    },
    amount: number
): Promise<{ success: boolean; transactionId: string; token: string }> {
    logger.info('PCI-DSS: Processing payment', {
        amount,
        lastFour: getLastFour(cardData.cardNumber)
        // NEVER log full card number or CVV
    });

    try {
        // Tokenize card
        const token = tokenizeCardNumber(cardData.cardNumber);
        const lastFour = getLastFour(cardData.cardNumber);

        // In production, send to payment gateway (Stripe, Adyen, etc.)
        // Here we simulate successful payment
        const transactionId = `txn_${crypto.randomBytes(16).toString('hex')}`;

        // Store ONLY tokenized data
        throw new Error('PaymentMethod model is not implemented in schema.prisma. Cannot tokenize card.');

        // Audit payment access
        await auditPaymentAccess('PAYMENT_PROCESSED', {
            transactionId,
            amount,
            lastFour
        });

        return {
            success: true,
            transactionId,
            token
        };

    } catch (error: any) {
        logger.error('PCI-DSS: Payment processing failed', {
            error: error.message
            // NEVER log card details in errors
        });
        throw error;
    }
}

/**
 * Detect card brand
 * 
 * @param cardNumber - Card number
 * @returns Brand (VISA, MASTERCARD, etc.)
 */
function detectCardBrand(cardNumber: string): string {
    const sanitized = cardNumber.replace(/[\s-]/g, '');

    if (/^4/.test(sanitized)) return 'VISA';
    if (/^5[1-5]/.test(sanitized)) return 'MASTERCARD';
    if (/^3[47]/.test(sanitized)) return 'AMEX';
    if (/^6(?:011|5)/.test(sanitized)) return 'DISCOVER';

    return 'UNKNOWN';
}

/**
 * Audit payment data access
 * 
 * Required by PCI-DSS Requirement 10.
 * 
 * @param action - Action type
 * @param details - Action details
 */
export async function auditPaymentAccess(
    action: string,
    details: Record<string, any>
): Promise<void> {
    await prisma.auditLog.create({
        data: {
            eventId: crypto.randomUUID(),
            eventType: `PCI_${action}`,
            aggregateId: details.transactionId || 'N/A',
            aggregateType: 'Payment',
            payload: {
                ...details,
                // Redact sensitive data
                cardNumber: undefined,
                cvv: undefined
            },
            hotelId: 'SYSTEM'
        }
    });

    logger.info(`PCI-DSS: ${action}`, {
        ...details,
        // NEVER log card numbers or CVV
        cardNumber: '[REDACTED]',
        cvv: '[REDACTED]'
    });
}

/**
 * Validate PCI-DSS compliance
 * 
 * Self-assessment checklist.
 * 
 * @returns Compliance status
 */
export async function validatePCICompliance(): Promise<{
    compliant: boolean;
    issues: string[];
}> {
    const issues: string[] = [];

    // Check 1: Encryption key configured
    if (ENCRYPTION_KEY === 'change-me-in-production-32-chars') {
        issues.push('PAYMENT_ENCRYPTION_KEY not configured in production');
    }

    // Check 2: No plain text card numbers in database
    // Stubbed since PaymentMethod model is not in schema
    const unsafePayments = 0;

    if (unsafePayments === 0) {
        issues.push('Warning: No tokenized payment methods found (may indicate plain text storage)');
    }

    // Check 3: Audit logging enabled
    const recentAudits = await prisma.auditLog.count({
        where: {
            eventType: { startsWith: 'PCI_' },
            occurredAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
        }
    });

    if (recentAudits === 0) {
        issues.push('No payment audit logs in last 24 hours');
    }

    return {
        compliant: issues.length === 0,
        issues
    };
}
