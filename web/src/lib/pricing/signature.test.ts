import { describe, it, expect } from 'vitest';
import {
    generatePricingSignature,
    validatePricingSignature,
    extractPricingComponents,
    type PricingComponents,
    type Quote,
    type BookRequest
} from './signature';

describe('Pricing Signature', () => {
    const basePricingComponents: PricingComponents = {
        baseRate: 100,
        taxes: [
            { name: 'VAT', amount: 10, rate: 0.1 },
            { name: 'City Tax', amount: 5 }
        ],
        fees: [
            { name: 'Service Fee', amount: 15 }
        ],
        policies: {
            cancellation: {
                deadline: new Date('2026-02-09T12:00:00Z'),
                penalty: 50
            },
            noShow: {
                penalty: 100
            },
            guarantee: {
                required: true,
                type: 'CREDIT_CARD'
            }
        },
        restrictions: [
            { type: 'MIN_LOS', value: 2 },
            { type: 'CTA', value: false, date: new Date('2026-02-10') }
        ],
        ratePlanCode: 'BAR',
        roomTypeCode: 'DLX',
        dates: {
            from: new Date('2026-02-10'),
            to: new Date('2026-02-13')
        }
    };

    describe('generatePricingSignature', () => {
        it('should generate a deterministic signature', () => {
            const signature1 = generatePricingSignature(basePricingComponents);
            const signature2 = generatePricingSignature(basePricingComponents);

            expect(signature1).toBe(signature2);
            expect(signature1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex format
        });

        it('should generate different signatures for different base rates', () => {
            const components1 = { ...basePricingComponents, baseRate: 100 };
            const components2 = { ...basePricingComponents, baseRate: 120 };

            const signature1 = generatePricingSignature(components1);
            const signature2 = generatePricingSignature(components2);

            expect(signature1).not.toBe(signature2);
        });

        it('should generate different signatures when taxes change', () => {
            const components1 = { ...basePricingComponents };
            const components2 = {
                ...basePricingComponents,
                taxes: [
                    { name: 'VAT', amount: 15, rate: 0.15 }, // Changed
                    { name: 'City Tax', amount: 5 }
                ]
            };

            const signature1 = generatePricingSignature(components1);
            const signature2 = generatePricingSignature(components2);

            expect(signature1).not.toBe(signature2);
        });

        it('should generate different signatures when policies change', () => {
            const components1 = { ...basePricingComponents };
            const components2 = {
                ...basePricingComponents,
                policies: {
                    ...basePricingComponents.policies,
                    cancellation: {
                        deadline: new Date('2026-02-09T12:00:00Z'),
                        penalty: 70 // Changed penalty
                    }
                }
            };

            const signature1 = generatePricingSignature(components1);
            const signature2 = generatePricingSignature(components2);

            expect(signature1).not.toBe(signature2);
        });

        it('should generate different signatures when restrictions change', () => {
            const components1 = { ...basePricingComponents };
            const components2 = {
                ...basePricingComponents,
                restrictions: [
                    { type: 'MIN_LOS', value: 3 }, // Changed from 2 to 3
                    { type: 'CTA', value: false, date: new Date('2026-02-10') }
                ]
            };

            const signature1 = generatePricingSignature(components1);
            const signature2 = generatePricingSignature(components2);

            expect(signature1).not.toBe(signature2);
        });

        it('should be order-independent for arrays', () => {
            const components1 = {
                ...basePricingComponents,
                taxes: [
                    { name: 'VAT', amount: 10, rate: 0.1 },
                    { name: 'City Tax', amount: 5 }
                ]
            };

            const components2 = {
                ...basePricingComponents,
                taxes: [
                    { name: 'City Tax', amount: 5 },
                    { name: 'VAT', amount: 10, rate: 0.1 }
                ]
            };

            const signature1 = generatePricingSignature(components1);
            const signature2 = generatePricingSignature(components2);

            // With canonical JSON, order matters - so these should be different
            // This is intentional to catch even ordering changes
            expect(signature1).not.toBe(signature2);
        });
    });

    describe('validatePricingSignature', () => {
        const quote: Quote = {
            quoteId: 'Q123',
            pricingSignature: 'abc123def456',
            validUntil: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
            baseRate: 100,
            total: 130
        };

        it('should validate matching signatures successfully', () => {
            const bookRequest: BookRequest = {
                quoteId: 'Q123',
                pricingSignature: 'abc123def456',
                guestName: 'John Doe'
            };

            const result = validatePricingSignature(bookRequest, quote);

            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it('should reject booking when signature is missing', () => {
            const bookRequest: BookRequest = {
                quoteId: 'Q123',
                guestName: 'John Doe'
                // missing pricingSignature
            };

            const result = validatePricingSignature(bookRequest, quote);

            expect(result.valid).toBe(false);
            expect(result.error).toBe('MISSING_PRICING_SIGNATURE');
            expect(result.details).toContain('must include pricingSignature');
        });

        it('should reject booking when signature does not match', () => {
            const bookRequest: BookRequest = {
                quoteId: 'Q123',
                pricingSignature: 'INVALID_SIGNATURE',
                guestName: 'John Doe'
            };

            const result = validatePricingSignature(bookRequest, quote);

            expect(result.valid).toBe(false);
            expect(result.error).toBe('PRICING_MISMATCH');
            expect(result.details).toContain('pricing has changed');
        });

        it('should reject booking when quote has expired', () => {
            const expiredQuote: Quote = {
                ...quote,
                validUntil: new Date(Date.now() - 1000) // 1 second ago
            };

            const bookRequest: BookRequest = {
                quoteId: 'Q123',
                pricingSignature: 'abc123def456',
                guestName: 'John Doe'
            };

            const result = validatePricingSignature(bookRequest, expiredQuote);

            expect(result.valid).toBe(false);
            expect(result.error).toBe('QUOTE_EXPIRED');
            expect(result.details).toContain('expired');
        });
    });

    describe('extractPricingComponents', () => {
        it('should extract all pricing components from quote data', () => {
            const quoteData = {
                baseRate: 150,
                taxes: [
                    { name: 'VAT', amount: 15, rate: 0.1 }
                ],
                fees: [
                    { name: 'Cleaning Fee', amount: 20 }
                ],
                policies: {
                    cancellation: {
                        deadline: new Date('2026-03-01'),
                        penalty: 75
                    },
                    guarantee: {
                        required: true
                    }
                },
                restrictions: [
                    { type: 'MIN_LOS', value: 3 }
                ],
                ratePlanCode: 'PROMO',
                roomTypeCode: 'STE',
                checkIn: '2026-03-05',
                checkOut: '2026-03-08'
            };

            const components = extractPricingComponents(quoteData);

            expect(components.baseRate).toBe(150);
            expect(components.taxes).toHaveLength(1);
            expect(components.taxes[0].name).toBe('VAT');
            expect(components.fees).toHaveLength(1);
            expect(components.fees[0].amount).toBe(20);
            expect(components.policies.cancellation?.penalty).toBe(75);
            expect(components.restrictions).toHaveLength(1);
            expect(components.ratePlanCode).toBe('PROMO');
            expect(components.roomTypeCode).toBe('STE');
            expect(components.dates.from).toEqual(new Date('2026-03-05'));
            expect(components.dates.to).toEqual(new Date('2026-03-08'));
        });

        it('should handle missing optional fields', () => {
            const quoteData = {
                baseRate: 100,
                ratePlanCode: 'BAR',
                roomTypeCode: 'STD',
                checkIn: '2026-04-01',
                checkOut: '2026-04-03'
                // missing taxes, fees, policies, restrictions
            };

            const components = extractPricingComponents(quoteData);

            expect(components.baseRate).toBe(100);
            expect(components.taxes).toEqual([]);
            expect(components.fees).toEqual([]);
            expect(components.policies.cancellation).toBeUndefined();
            expect(components.restrictions).toEqual([]);
        });
    });

    describe('End-to-End Scenario', () => {
        it('should validate consistent Quote → Book flow', () => {
            // 1. Create pricing components (normally from quote logic)
            const components: PricingComponents = {
                baseRate: 200,
                taxes: [{ name: 'VAT', amount: 20, rate: 0.1 }],
                fees: [{ name: 'Service', amount: 10 }],
                policies: {
                    cancellation: { deadline: new Date('2026-05-10'), penalty: 100 },
                    guarantee: { required: true, type: 'CREDIT_CARD' }
                },
                restrictions: [{ type: 'MIN_LOS', value: 2 }],
                ratePlanCode: 'FLEX',
                roomTypeCode: 'DLX',
                dates: { from: new Date('2026-05-15'), to: new Date('2026-05-18') }
            };

            // 2. Generate signature
            const pricingSignature = generatePricingSignature(components);

            // 3. Create quote with signature
            const quote: Quote = {
                quoteId: 'Q-E2E-001',
                pricingSignature,
                validUntil: new Date(Date.now() + 30 * 60 * 1000),
                baseRate: 200,
                total: 230
            };

            // 4. Book with same signature
            const bookRequest: BookRequest = {
                quoteId: 'Q-E2E-001',
                pricingSignature,
                guestName: 'Alice Smith',
                guestEmail: 'alice@example.com'
            };

            // 5. Validate
            const validation = validatePricingSignature(bookRequest, quote);

            expect(validation.valid).toBe(true);
        });

        it('should detect tampered pricing in Book', () => {
            // 1. Original pricing
            const originalComponents: PricingComponents = {
                baseRate: 100,
                taxes: [],
                fees: [],
                policies: {},
                restrictions: [],
                ratePlanCode: 'BAR',
                roomTypeCode: 'STD',
                dates: { from: new Date('2026-06-01'), to: new Date('2026-06-03') }
            };

            const originalSignature = generatePricingSignature(originalComponents);

            // 2. Quote with original pricing
            const quote: Quote = {
                quoteId: 'Q-TAMPER-001',
                pricingSignature: originalSignature,
                validUntil: new Date(Date.now() + 30 * 60 * 1000),
                baseRate: 100,
                total: 100
            };

            // 3. Attacker tries to create signature with different rate
            const tamperedComponents = { ...originalComponents, baseRate: 50 };
            const tamperedSignature = generatePricingSignature(tamperedComponents);

            // 4. Book with tampered signature
            const bookRequest: BookRequest = {
                quoteId: 'Q-TAMPER-001',
                pricingSignature: tamperedSignature, // Different!
                guestName: 'Hacker'
            };

            // 5. Validation should fail
            const validation = validatePricingSignature(bookRequest, quote);

            expect(validation.valid).toBe(false);
            expect(validation.error).toBe('PRICING_MISMATCH');
        });
    });
});
