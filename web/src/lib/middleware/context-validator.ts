/**
 * Context Validation Middleware
 * 
 * Validates context headers on all incoming API requests.
 * Returns 400 Bad Request if context is invalid.
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractContext, validateAppKey, attachContext } from '../context/validator';
import { logger } from '../logger';

/**
 * Context validation middleware
 * 
 * Validates required headers and attaches context to request.
 * 
 * @param req - Next.js request
 * @param handler - Route handler
 * @returns Response with validated context or 400 error
 */
export async function withContextValidation(
    req: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
    // Extract and validate context
    const result = extractContext(req.headers);

    if (!result.valid || !result.context) {
        logger.warn('Context validation failed', {
            error: result.error,
            message: result.message,
            url: req.url,
            method: req.method
        });

        return NextResponse.json(
            {
                success: false,
                error: result.error,
                message: result.message
            },
            { status: 400 }
        );
    }

    // Validate API key (async check)
    const isAuthorized = await validateAppKey(
        result.context.appKey,
        result.context.hotelId
    );

    if (!isAuthorized) {
        logger.warn('API key validation failed', {
            hotelId: result.context.hotelId,
            appKey: result.context.appKey.substring(0, 10) + '...',  // Redact
            url: req.url
        });

        return NextResponse.json(
            {
                success: false,
                error: 'UNAUTHORIZED',
                message: 'Invalid API key or insufficient permissions'
            },
            { status: 401 }
        );
    }

    // Attach context to request
    attachContext(req, result.context);

    logger.debug('Context validated', {
        hotelId: result.context.hotelId,
        domain: result.context.domain,
        channelCode: result.context.channelCode,
        hubId: result.context.hubId
    });

    // Execute handler with validated context
    return handler(req);
}

/**
 * Wrapper for API routes with context validation
 * 
 * Usage:
 * ```ts
 * import { withContext } from '@/lib/middleware/context-validator';
 * 
 * export const POST = withContext(async (req) => {
 *   const context = req.context;
 *   // Your handler logic
 *   return Response.json({ success: true });
 * });
 * ```
 */
export function withContext(
    handler: (req: Request) => Promise<Response>
) {
    return async (req: Request): Promise<Response> => {
        const nextReq = req as any as NextRequest;

        return withContextValidation(nextReq, async (_) => {
            const response = await handler(req);
            return new NextResponse(response.body, response);
        });
    };
}
