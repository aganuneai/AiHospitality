import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateBulkARIRequest } from './bulk-validator';

describe('BulkARIValidator', () => {
    describe('validateBulkARIRequest', () => {
        it('should validate correct request', () => {
            const request = {
                operations: [
                    {
                        date: '2026-03-10',
                        roomTypeCode: 'DLX',
                        available: 10,
                        price: 150.00
                    }
                ]
            };

            const result = validateBulkARIRequest(request);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject empty operations array', () => {
            const request = { operations: [] };

            const result = validateBulkARIRequest(request);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes('At least one'))).toBe(true);
        });

        it('should reject too many operations', () => {
            const operations = Array(501).fill({
                date: '2026-03-10',
                roomTypeCode: 'DLX',
                available: 10
            });

            const result = validateBulkARIRequest({ operations });

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes('Maximum 500'))).toBe(true);
        });

        it('should reject missing date', () => {
            const request = {
                operations: [
                    {
                        roomTypeCode: 'DLX',
                        available: 10
                    } as any
                ]
            };

            const result = validateBulkARIRequest(request);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.field === 'date')).toBe(true);
        });

        it('should reject invalid date format', () => {
            const request = {
                operations: [
                    {
                        date: '10/03/2026',  // Wrong format
                        roomTypeCode: 'DLX',
                        available: 10
                    }
                ]
            };

            const result = validateBulkARIRequest(request);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes('YYYY-MM-DD'))).toBe(true);
        });

        it('should reject past dates', () => {
            const request = {
                operations: [
                    {
                        date: '2020-01-01',  // Past date
                        roomTypeCode: 'DLX',
                        available: 10
                    }
                ]
            };

            const result = validateBulkARIRequest(request);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes('past'))).toBe(true);
        });

        it('should reject missing room type code', () => {
            const request = {
                operations: [
                    {
                        date: '2026-03-10',
                        available: 10
                    } as any
                ]
            };

            const result = validateBulkARIRequest(request);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.field === 'roomTypeCode')).toBe(true);
        });

        it('should reject operation with no update fields', () => {
            const request = {
                operations: [
                    {
                        date: '2026-03-10',
                        roomTypeCode: 'DLX'
                        // No update fields
                    }
                ]
            };

            const result = validateBulkARIRequest(request);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes('At least one update field'))).toBe(true);
        });

        it('should reject negative available', () => {
            const request = {
                operations: [
                    {
                        date: '2026-03-10',
                        roomTypeCode: 'DLX',
                        available: -5
                    }
                ]
            };

            const result = validateBulkARIRequest(request);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.field === 'available')).toBe(true);
        });

        it('should reject negative price', () => {
            const request = {
                operations: [
                    {
                        date: '2026-03-10',
                        roomTypeCode: 'DLX',
                        price: -100
                    }
                ]
            };

            const result = validateBulkARIRequest(request);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.field === 'price')).toBe(true);
        });

        it('should reject minLos > maxLos', () => {
            const request = {
                operations: [
                    {
                        date: '2026-03-10',
                        roomTypeCode: 'DLX',
                        minLos: 5,
                        maxLos: 3  // Invalid: min > max
                    }
                ]
            };

            const result = validateBulkARIRequest(request);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes('cannot be greater'))).toBe(true);
        });

        it('should validate multiple operations', () => {
            const request = {
                operations: [
                    {
                        date: '2026-03-10',
                        roomTypeCode: 'DLX',
                        available: 10
                    },
                    {
                        date: '2026-03-11',
                        roomTypeCode: 'STD',
                        price: 120.00,
                        minLos: 2
                    }
                ]
            };

            const result = validateBulkARIRequest(request);

            expect(result.valid).toBe(true);
        });

        it('should track error indices correctly', () => {
            const request = {
                operations: [
                    {
                        date: '2026-03-10',
                        roomTypeCode: 'DLX',
                        available: 10
                    },
                    {
                        date: 'invalid',  // Error at index 1
                        roomTypeCode: 'STD',
                        price: 100
                    },
                    {
                        date: '2026-03-12',
                        roomTypeCode: 'STE',
                        available: 5
                    }
                ]
            };

            const result = validateBulkARIRequest(request);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.index === 1)).toBe(true);
        });
    });
});
