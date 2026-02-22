import { createHash } from 'crypto';
import { canonicalize } from 'json-canonicalize';

export interface PricingComponents {
    baseRate: number;
    taxes: Array<{ name: string; amount: number; rate?: number }>;
    fees: Array<{ name: string; amount: number }>;
    policies: {
        cancellation?: {
            deadline?: Date;
            penalty?: number;
        };
        noShow?: {
            penalty?: number;
        };
        guarantee?: {
            required: boolean;
            type?: string;
        };
    };
    restrictions: Array<{
        type: string;
        value: any;
        date?: Date;
    }>;
    ratePlanCode: string;
    roomTypeCode: string;
    dates: {
        from: Date;
        to: Date;
    };
}

export interface Quote {
    quoteId: string;
    pricingSignature: string;
    validUntil: Date;
    [key: string]: any;
}

export interface BookRequest {
    quoteId?: string;
    pricingSignature?: string;
    [key: string]: any;
}

export interface ValidationResult {
    valid: boolean;
    error?: string;
    details?: string;
}

/**
 * Generate deterministic pricing signature (SHA-256 hash)
 * 
 * This creates a cryptographic hash of all pricing components to ensure
 * consistency between quote and book operations. Any change in rates,
 * taxes, fees, or policies will result in a different signature.
 * 
 * @param components - All pricing-related data
 * @returns Hex string SHA-256 hash
 */
export function generatePricingSignature(
    components: PricingComponents
): string {
    // Canonicalize to ensure deterministic JSON ordering
    const canonical = canonicalize(components);

    // Generate SHA-256 hash
    return createHash('sha256')
        .update(canonical)
        .digest('hex');
}

/**
 * Validate pricing signature matches between quote and book request
 * 
 * Prevents "bait and switch" scenarios where pricing changes between
 * quote and booking. Returns validation failure if signatures don't match.
 * 
 * @param bookRequest - Booking request with pricingSignature
 * @param originalQuote - Original quote to validate against
 * @returns Validation result
 */
export function validatePricingSignature(
    bookRequest: BookRequest,
    originalQuote: Quote
): ValidationResult {
    // If no signature provided in book request, cannot validate
    if (!bookRequest.pricingSignature) {
        return {
            valid: false,
            error: 'MISSING_PRICING_SIGNATURE',
            details: 'Booking request must include pricingSignature from quote'
        };
    }

    // Check if signatures match
    if (bookRequest.pricingSignature !== originalQuote.pricingSignature) {
        return {
            valid: false,
            error: 'PRICING_MISMATCH',
            details: 'Quote pricing has changed. Please request a new quote.'
        };
    }

    // Check if quote is still valid (not expired)
    if (new Date() > new Date(originalQuote.validUntil)) {
        return {
            valid: false,
            error: 'QUOTE_EXPIRED',
            details: 'Quote has expired. Please request a new quote.'
        };
    }

    return { valid: true };
}

/**
 * Helper to extract pricing components from quote data
 * 
 * @param quoteData - Raw quote data
 * @returns Pricing components for signature generation
 */
export function extractPricingComponents(quoteData: any): PricingComponents {
    return {
        baseRate: quoteData.baseRate || 0,
        taxes: quoteData.taxes || [],
        fees: quoteData.fees || [],
        policies: {
            cancellation: quoteData.policies?.cancellation,
            noShow: quoteData.policies?.noShow,
            guarantee: quoteData.policies?.guarantee
        },
        restrictions: quoteData.restrictions || [],
        ratePlanCode: quoteData.ratePlanCode,
        roomTypeCode: quoteData.roomTypeCode,
        dates: {
            from: new Date(quoteData.checkIn),
            to: new Date(quoteData.checkOut)
        }
    };
}
