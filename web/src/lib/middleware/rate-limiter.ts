/**
 * Rate Limiting Middleware
 * 
 * Applies rate limiting to API requests.
 * Returns 429 Too Many Requests if limit exceeded.
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter } from '../rate-limiter/limiter';
import { ClientIdentifier } from '../rate-limiter/types';
import { logger } from '../logger';

/**
 * Extract client identifier from request
 * 
 * Priority order:
 * 1. API key (from x-app-key header)
 * 2. User ID (from auth token, if implemented)
 * 3. IP address (fallback)
 * 
 * @param req - Request object
 * @returns Client identifier
 */
function extractClientIdentifier(req: NextRequest): ClientIdentifier {
    // Try API key first
    const appKey = req.headers.get('x-app-key');
    if (appKey) {
        return {
            type: 'apiKey',
            value: appKey
        };
    }

    // Try user ID (if auth is implemented)
    // const userId = req.auth?.userId;
    // if (userId) {
    //   return { type: 'user', value: userId };
    // }

    // Fallback to IP
    const ip = req.headers.get('x-forwarded-for')
        || req.headers.get('x-real-ip')
        || 'unknown';

    return {
        type: 'ip',
        value: ip.split(',')[0].trim()
    };
}

/**
 * Rate limiting middleware
 * 
 * @param req - Next.js request
 * @param handler - Route handler
 * @returns Response or 429 if rate limited
 */
export async function withRateLimit(
    req: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
    try {
        const client = extractClientIdentifier(req);
        const url = new URL(req.url);
        const endpoint = url.pathname;

        // Check rate limit
        const result = await rateLimiter.checkLimit(client, endpoint);

        // Add rate limit headers to all responses
        const headers = {
            'X-RateLimit-Limit': result.allowed ?
                (result.remaining + 1).toString() : '0',
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.resetAt.toISOString()
        };

        if (!result.allowed) {
            // Rate limit exceeded
            logger.warn('Rate limit exceeded', {
                client,
                endpoint,
                retryAfter: result.retryAfter
            });

            return NextResponse.json(
                {
                    success: false,
                    error: 'RATE_LIMIT_EXCEEDED',
                    message: 'Too many requests. Please try again later.',
                    retryAfter: result.retryAfter
                },
                {
                    status: 429,
                    headers: {
                        ...headers,
                        'Retry-After': result.retryAfter?.toString() || '60'
                    }
                }
            );
        }

        // Execute handler
        const response = await handler(req);

        // Add rate limit headers to successful response
        Object.entries(headers).forEach(([key, value]) => {
            response.headers.set(key, value);
        });

        return response;

    } catch (error: any) {
        // If Redis is down, don't block requests (fail open)
        logger.error('Rate limiter error, failing open', {
            error: error.message,
            stack: error.stack
        });

        return handler(req);
    }
}

/**
 * Wrapper for API routes with rate limiting
 * 
 * Usage:
 * ```ts
 * import { withRateLimit } from '@/lib/middleware/rate-limiter';
 * 
 * export const POST = rateLimited(async (req) => {
 *   // Your handler logic
 *   return Response.json({ success: true });
 * });
 * ```
 */
export function rateLimited(
    handler: (req: Request) => Promise<Response>
) {
    return async (req: Request): Promise<Response> => {
        const nextReq = req as any as NextRequest;

        return withRateLimit(nextReq, async (_) => {
            const response = await handler(req);
            return new NextResponse(response.body, response);
        });
    };
}
