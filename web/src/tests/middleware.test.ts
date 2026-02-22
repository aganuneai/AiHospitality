import { describe, it, expect, vi } from 'vitest';
import { middleware } from '@/middleware';
import { NextRequest } from 'next/server';

describe('Middleware Validation', () => {
    it('should reject requests without context headers (hotelId)', () => {
        const req = new NextRequest('http://localhost/api/v1/distribution/shop', {
            headers: {}
        });
        const res = middleware(req);
        // Middleware returns 400 if hotelId missing (via validateContext)
        expect(res.status).toBe(400);
    });

    it('should reject DISTRIBUTION routes without x-domain=DISTRIBUTION', () => {
        const req = new NextRequest('http://localhost/api/v1/distribution/shop', {
            headers: {
                'x-hotel-id': 'HOTEL-1',
                // Missing x-domain or wrong domain
            }
        });
        const res = middleware(req);
        // validateContext might pass if it defaults valid=true for non-dist, 
        // but Middleware path check should catch it?
        // Actually validateContext doesn't check 'x-domain' presence strictly unless logic requires it.
        // But our middleware code specifically checks: if (request.nextUrl.pathname.startsWith('/api/v1/distribution') && context?.domain !== 'DISTRIBUTION')

        // Wait, parseContext returns domain if 'x-domain' is present.
        expect(res.status).toBe(400);
    });

    it('should reject DISTRIBUTION routes without x-channel-code', () => {
        const req = new NextRequest('http://localhost/api/v1/distribution/shop', {
            headers: {
                'x-hotel-id': 'HOTEL-1',
                'x-domain': 'DISTRIBUTION',
                // missing channel code
            }
        });
        const res = middleware(req);
        expect(res.status).toBe(400);
        // Expect specific message about channel-code
    });

    it('should reject DISTRIBUTION routes without x-app-key', () => {
        const req = new NextRequest('http://localhost/api/v1/distribution/shop', {
            headers: {
                'x-hotel-id': 'HOTEL-1',
                'x-domain': 'DISTRIBUTION',
                'x-channel-code': 'OTA-1'
                // missing app key
            }
        });
        const res = middleware(req);
        expect(res.status).toBe(400);
    });

    it('should accept valid DISTRIBUTION requests', () => {
        const req = new NextRequest('http://localhost/api/v1/distribution/shop', {
            headers: {
                'x-hotel-id': 'HOTEL-1',
                'x-domain': 'DISTRIBUTION',
                'x-channel-code': 'OTA-1',
                'x-app-key': 'SECRET-KEY'
            }
        });
        const res = middleware(req);
        // Should either be next() (status 200/undefined in mock) or we check headers
        // NextResponse.next() returns a response with status 200 usually in valid flow testing context?
        // Actually NextResponse.next() returns a response object that acts as a pass-through.
        // We can check if it has x-context-validated header we set.

        expect(res.headers.get('x-context-validated')).toBe('true');
    });
});
