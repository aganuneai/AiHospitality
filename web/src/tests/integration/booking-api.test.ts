
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/v1/bookings/route';
import { NextRequest } from 'next/server';

// Mock Dependencies
vi.mock('@/lib/services/book-service', () => ({
    BookService: class {
        createReservation = vi.fn().mockResolvedValue({
            reservationId: 'RES-INT-001',
            pnr: 'PNR-INT-1',
            status: 'CONFIRMED',
            total: 500,
            currency: 'USD'
        });
    }
}));

// Helper to create requests
function createRequest(body: any, headers: Record<string, string> = {}) {
    return new NextRequest('http://localhost:3000/api/v1/bookings', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-hotel-id': 'HOTEL-TEST',
            'x-domain': 'PROPERTY',
            'x-request-id': 'REQ-TEST-001',
            ...headers
        },
        body: JSON.stringify(body)
    });
}

describe('Integration: Booking API (POST)', () => {

    const validBody = {
        context: {
            domain: 'PROPERTY',
            hotelId: 'HOTEL-TEST',
            requestId: 'REQ-TEST-001'
        },
        idempotencyKey: 'IDEMP-INT-1',
        quote: {
            quoteId: 'Q-INT-1',
            pricingSignature: 'SIG-INT-1'
        },
        guest: {
            primaryGuestName: 'Integration Tester',
            email: 'tester@example.com',
            phone: '555-0199'
        },
        stay: {
            checkIn: '2026-12-01',
            checkOut: '2026-12-05',
            adults: 1,
            children: 0,
            roomTypeCode: 'SUITE',
            ratePlanCode: 'BAR'
        }
    };

    it('should create a reservation with valid payload and headers', async () => {
        const body = { ...validBody, idempotencyKey: 'IDEMP-INT-OK-1' };
        const req = createRequest(body);
        const res = await POST(req);

        expect(res.status).toBe(201); // Created
        const data = await res.json();
        expect(data.booking.reservationId).toBe('RES-INT-001');
    });

    it('should reject request without idempotencyKey in body (API Layer Check)', async () => {
        const invalidBody = { ...validBody, idempotencyKey: undefined };
        const req = createRequest(invalidBody);
        const res = await POST(req);

        // The implementation checks specifically for idempotency key presence before full schema validation
        // OR schema validation catches it.
        // Let's see what happens based on code.
        // Code: check Body for idempotencyKey manually first?
        // Let's Assume validation catches it or custom logic.

        // Checking status
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.code).toMatch(/MISSING_IDEMPOTENCY_KEY|VALIDATION_ERROR/);
    });

    it('should reject request with invalid schema (e.g. invalid email)', async () => {
        const invalidBody = {
            ...validBody,
            idempotencyKey: 'IDEMP-INT-FAIL-1',
            guest: { ...validBody.guest, email: 'not-valid' }
        };
        const req = createRequest(invalidBody);
        const res = await POST(req);

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('should enforce Context headers (Middleware simulation / Route check)', async () => {
        // Since we are mocking NextRequest passed to POST, we are testing the route handler logic.
        // The Middleware runs BEFORE this.
        // But the Route Handler often re-validates context as a safety measure.
        // Let's see if route.ts parses context.

        const req = new NextRequest('http://localhost:3000/api/v1/bookings', {
            method: 'POST',
            body: JSON.stringify(validBody)
            // Missing headers
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.code).toBe('CONTEXT_INVALID');
    });
});
