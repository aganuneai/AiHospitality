import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { parseContext, validateContext } from './lib/context/context';

export function middleware(request: NextRequest) {
    // Only apply to API routes
    if (request.nextUrl.pathname.startsWith('/api/v1')) {
        console.log(`[Middleware] Incoming request: ${request.method} ${request.nextUrl.pathname}`);

        if (request.nextUrl.pathname.endsWith('/health') || request.nextUrl.pathname.startsWith('/api/v1/admin')) {
            return NextResponse.next();
        }
        // Explicitly validate context headers
        const validationError = validateContext(request);
        if (validationError) {
            return validationError;
        }

        const context = parseContext(request);

        // Additional Path-based validation enforcement
        if (request.nextUrl.pathname.startsWith('/api/v1/distribution')) {
            if (context?.domain !== 'DISTRIBUTION') {
                return NextResponse.json(
                    {
                        code: 'CONTEXT_MISMATCH',
                        message: 'Routes under /api/v1/distribution must have x-domain: DISTRIBUTION',
                    },
                    { status: 400 }
                );
            }
        }

        if (!context) {
            return NextResponse.json(
                {
                    code: 'CONTEXT_INVALID',
                    message: 'Invalid Context Envelope headers. proper headers required: x-hotel-id XOR x-hub-id, x-domain.',
                },
                { status: 400 }
            );
        }

        // Add parsed context to headers for downstream consumption if needed, 
        // though Next.js Middleware can't easily pass objects, we validate here.
        const response = NextResponse.next();
        response.headers.set('x-context-validated', 'true');
        response.headers.set('x-request-id', context.requestId);

        return response;
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/api/:path*',
};
