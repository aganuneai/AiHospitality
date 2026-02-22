
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/v1/ari/route';
import { NextRequest } from 'next/server';
import { AriEvent } from '@/lib/contracts/ari.schema';

// Mock Dependencies
vi.mock('@/lib/services/ari-processor.service', () => ({
    ariProcessorService: {
        processEvent: vi.fn().mockResolvedValue({
            success: true,
            status: 'APPLIED',
            message: 'Event processed successfully',
            eventId: 'mock-event-id'
        })
    }
}));

// Helper to create requests
function createRequest(body: any, headers: Record<string, string> = {}) {
    return new NextRequest('http://localhost:3000/api/v1/ari', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-hotel-id': 'HOTEL-TEST',
            'x-domain': 'DISTRIBUTION',
            'x-channel-code': 'BOOKING_COM',
            'x-request-id': 'REQ-ARI-001',
            ...headers
        },
        body: JSON.stringify(body)
    });
}

describe('Integration: ARI Push API (POST)', () => {

    const validAvailabilityEvent: AriEvent = {
        eventType: 'AVAILABILITY',
        roomTypeCode: 'DLX',
        dateRange: { from: '2026-12-01', to: '2026-12-05' },
        payload: {
            availability: 5,
            updateType: 'SET'
        }
    };

    const validRateEvent: AriEvent = {
        eventType: 'RATE',
        roomTypeCode: 'DLX',
        ratePlanCode: 'BAR',
        dateRange: { from: '2026-12-01', to: '2026-12-05' },
        payload: {
            baseRate: 150.00
        }
    };

    it('should process valid AVAILABILITY event', async () => {
        const req = createRequest(validAvailabilityEvent);
        const res = await POST(req);

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.status).toBe('APPLIED');
    });

    it('should process valid RATE event', async () => {
        const req = createRequest(validRateEvent);
        const res = await POST(req);

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
    });

    it('should reject invalid schema (missing payload field)', async () => {
        const invalidEvent = { ...validAvailabilityEvent, payload: { availability: -1 } }; // Invalid: min 0
        const req = createRequest(invalidEvent);
        const res = await POST(req);

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid context (missing channel code)', async () => {
        const req = new NextRequest('http://localhost:3000/api/v1/ari', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-hotel-id': 'HOTEL-TEST',
                'x-domain': 'DISTRIBUTION',
                // Missing x-channel-code
            },
            body: JSON.stringify(validAvailabilityEvent)
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.code).toBe('CONTEXT_INVALID');
    });

    it('should reject invalid context (wrong domain)', async () => {
        const req = createRequest(validAvailabilityEvent, { 'x-domain': 'PROPERTY' });
        const res = await POST(req);
        expect(res.status).toBe(400);
    });
});
