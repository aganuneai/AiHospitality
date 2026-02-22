import { NextRequest } from 'next/server';

/**
 * Test utilities for integration tests
 */

export function createMockRequest(
    url: string,
    options: {
        method?: string;
        headers?: Record<string, string>;
        body?: any;
    } = {}
): NextRequest {
    const { method = 'GET', headers = {}, body } = options;

    const defaultHeaders = {
        'x-hotel-id': 'test-hotel-123',
        'x-request-id': `test-${Date.now()}`,
        'content-type': 'application/json',
        ...headers
    };

    const request = new NextRequest(url, {
        method,
        headers: defaultHeaders,
        body: body ? JSON.stringify(body) : undefined
    });

    return request;
}

export async function extractJSON(response: Response) {
    const text = await response.text();
    try {
        return JSON.parse(text);
    } catch {
        return { error: 'Invalid JSON', body: text };
    }
}

export const testHotelId = 'test-hotel-123';
export const testRequestId = 'test-request-123';

export function generateIdempotencyKey(): string {
    return `test-idem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
