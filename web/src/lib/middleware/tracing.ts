/**
 * Tracing Middleware
 * 
 * Attaches trace context to all incoming requests.
 * This middleware should be applied globally to all routes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createTraceContext, attachTraceContext, type TraceContext } from '../observability/tracing';
import { metricsCollector } from '../observability/metrics';
import { logger } from '../logger';

/**
 * Extract endpoint path from request
 * 
 * Normalizes the path for metrics (removes query params, IDs)
 * 
 * @param req - Next.js request
 * @returns Normalized endpoint path
 */
function getEndpointPath(req: NextRequest): string {
    const url = new URL(req.url);
    let path = url.pathname;

    // Normalize dynamic segments (e.g., /bookings/abc123 → /bookings/:id)
    path = path.replace(/\/[0-9a-f-]{36}/gi, '/:id');  // UUIDs
    path = path.replace(/\/[A-Z0-9]{6,}/g, '/:id');    // PNRs

    return path;
}

/**
 * Tracing middleware
 * 
 * Creates trace context and attaches to request.
 * Records metrics for all requests.
 * 
 * @param req - Next.js request
 * @param handler - Route handler function
 * @returns Response with trace headers
 */
export async function withTracing(
    req: NextRequest,
    handler: (req: NextRequest, traceContext: TraceContext) => Promise<NextResponse>
): Promise<NextResponse> {
    const startTime = Date.now();
    const endpoint = getEndpointPath(req);

    // Create trace context
    const traceContext = createTraceContext(req.headers);
    attachTraceContext(req, traceContext);

    // Record request start
    metricsCollector.recordRequest(endpoint);

    logger.info('Request started', {
        requestId: traceContext.requestId,
        correlationId: traceContext.correlationId,
        spanId: traceContext.spanId,
        method: req.method,
        path: endpoint,
        userAgent: req.headers.get('user-agent')
    });

    try {
        // Execute handler
        const response = await handler(req, traceContext);

        // Record latency
        const duration = Date.now() - startTime;
        metricsCollector.recordLatency(endpoint, duration);

        logger.info('Request completed', {
            requestId: traceContext.requestId,
            method: req.method,
            path: endpoint,
            status: response.status,
            durationMs: duration
        });

        // Add trace headers to response
        response.headers.set('x-request-id', traceContext.requestId);
        if (traceContext.correlationId) {
            response.headers.set('x-correlation-id', traceContext.correlationId);
        }

        return response;

    } catch (error: any) {
        // Record error
        const duration = Date.now() - startTime;
        metricsCollector.recordLatency(endpoint, duration);
        metricsCollector.recordError(endpoint, error.code || 'UNKNOWN_ERROR');

        logger.error('Request failed', {
            requestId: traceContext.requestId,
            method: req.method,
            path: endpoint,
            error: error.message,
            stack: error.stack,
            durationMs: duration
        });

        throw error;
    }
}

/**
 * Simple wrapper for API routes that don't use middleware
 * 
 * Usage in API route:
 * ```ts
 * import { tracedHandler } from '@/lib/middleware/tracing';
 * 
 * export const POST = tracedHandler(async (req, traceContext) => {
 *   // Your handler logic
 *   return Response.json({ success: true });
 * });
 * ```
 */
export function tracedHandler(
    handler: (req: Request, traceContext: TraceContext) => Promise<Response>
) {
    return async (req: Request): Promise<Response> => {
        const nextReq = req as any as NextRequest;

        return withTracing(nextReq, async (_, traceContext) => {
            const response = await handler(req, traceContext);
            return new NextResponse(response.body, response);
        });
    };
}
