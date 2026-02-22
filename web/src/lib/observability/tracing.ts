/**
 * Distributed Tracing Module
 * 
 * Provides trace context propagation for distributed systems.
 * Implements OpenTelemetry-inspired patterns for request correlation.
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Trace context for request correlation
 */
export interface TraceContext {
    requestId: string;        // Unique ID for this request
    correlationId?: string;   // ID to correlate across multiple requests
    spanId: string;           // Unique ID for this span/operation
    parentSpanId?: string;    // Parent span ID (for nested operations)
    timestamp: Date;          // When this trace started
}

/**
 * Create trace context from HTTP headers
 * 
 * Extracts trace IDs from incoming request headers.
 * If headers don't exist, generates new IDs.
 * 
 * @param headers - HTTP request headers
 * @returns Trace context
 */
export function createTraceContext(headers: Headers | Record<string, string>): TraceContext {
    // Support both Headers object and plain object
    const getHeader = (key: string): string | null => {
        if (headers instanceof Headers) {
            return headers.get(key);
        }
        return headers[key] || headers[key.toLowerCase()] || null;
    };

    const requestId = getHeader('x-request-id') || uuidv4();
    const correlationId = getHeader('x-correlation-id') || undefined;
    const parentSpanId = getHeader('x-parent-span-id') || undefined;

    return {
        requestId,
        correlationId,
        spanId: uuidv4(),
        parentSpanId,
        timestamp: new Date()
    };
}

/**
 * Inject trace headers for downstream requests
 * 
 * Adds trace context to outgoing HTTP headers so downstream
 * services can continue the trace.
 * 
 * @param headers - Existing headers object
 * @param context - Trace context to inject
 * @returns Headers with trace context
 */
export function injectTraceHeaders(
    headers: HeadersInit,
    context: TraceContext
): HeadersInit {
    return {
        ...headers,
        'x-request-id': context.requestId,
        'x-correlation-id': context.correlationId || context.requestId,
        'x-span-id': context.spanId,
        'x-parent-span-id': context.spanId  // This becomes parent for downstream
    };
}

/**
 * Create a child span from parent context
 * 
 * Useful for tracking nested operations within a request.
 * 
 * @param parentContext - Parent trace context
 * @param operationName - Name of the child operation
 * @returns Child trace context
 */
export function createChildSpan(
    parentContext: TraceContext,
    operationName: string
): TraceContext {
    return {
        requestId: parentContext.requestId,
        correlationId: parentContext.correlationId,
        spanId: uuidv4(),
        parentSpanId: parentContext.spanId,
        timestamp: new Date()
    };
}

/**
 * Get trace context from request
 * 
 * Helper to extract trace context that was attached to a request object.
 * 
 * @param req - Request object (with traceContext attached)
 * @returns Trace context or undefined
 */
export function getTraceContext(req: any): TraceContext | undefined {
    return req.traceContext;
}

/**
 * Attach trace context to request
 * 
 * Mutates the request object to add traceContext property.
 * 
 * @param req - Request object
 * @param context - Trace context to attach
 */
export function attachTraceContext(req: any, context: TraceContext): void {
    req.traceContext = context;
}
