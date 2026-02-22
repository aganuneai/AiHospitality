import { describe, it, expect } from 'vitest';
import { BookRequestSchema } from '@/lib/schemas/booking/booking.schema';

describe('Booking Contracts', () => {
    const validRequest = {
        context: {
            domain: 'DISTRIBUTION',
            hotelId: 'HOTEL-1',
            requestId: 'REQ-1'
        },
        idempotencyKey: 'IDEMP-1',
        quote: {
            quoteId: 'Q-1',
            pricingSignature: 'SIG-1'
        },
        guest: {
            primaryGuestName: 'John Doe',
            email: 'john@example.com',
            phone: '1234567890'
        },
        stay: {
            checkIn: '2026-10-10',
            checkOut: '2026-10-15',
            adults: 2,
            children: 0,
            roomTypeCode: 'RT-1',
            ratePlanCode: 'RP-1'
        },
        payment: {
            method: 'CARD',
            token: 'TOK-123'
        }
    };

    it('should validate a correct request', () => {
        const result = BookRequestSchema.safeParse(validRequest);
        expect(result.success).toBe(true);
    });

    it('should fail if email is invalid', () => {
        const invalidRequest = {
            ...validRequest,
            guest: {
                ...validRequest.guest,
                email: 'not-an-email'
            }
        };
        const result = BookRequestSchema.safeParse(invalidRequest);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toContain('Invalid email');
        }
    });

    it('should fail if hotelId AND hubId are both provided', () => {
        const invalidRequest = {
            ...validRequest,
            context: {
                ...validRequest.context,
                hubId: 'HUB-1'
            }
        };
        const result = BookRequestSchema.safeParse(invalidRequest);
        expect(result.success).toBe(false);
        if (!result.success) {
            // Zod refine error usually at root or path
            // Our refinement is on context object
            expect(result.error.issues[0].message).toContain('Must provide either hotelId OR hubId');
        }
    });

    it('should fail if required fields are missing', () => {
        const invalidRequest = {
            ...validRequest,
            idempotencyKey: undefined
        };
        const result = BookRequestSchema.safeParse(invalidRequest);
        expect(result.success).toBe(false);
    });
});
