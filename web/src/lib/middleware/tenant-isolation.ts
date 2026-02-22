/**
 * Tenant Isolation Middleware
 * 
 * Extracts tenant from request and sets context.
 */

import { NextRequest, NextResponse } from 'next/server';
import { runWithTenant } from '../tenancy/tenant-context';
import { logger } from '../logger';

/**
 * Extract tenant ID from request
 * 
 * Priority order:
 * 1. JWT token (tenant claim)
 * 2. x-tenant-id header
 * 3. Subdomain (tenant.aihospitality.com)
 * 
 * @param req - Request object
 * @returns Tenant ID or null
 */
function extractTenantId(req: NextRequest): string | null {
    // Try header first
    const headerTenantId = req.headers.get('x-tenant-id');
    if (headerTenantId) {
        return headerTenantId;
    }

    // Try subdomain
    const host = req.headers.get('host');
    if (host) {
        const subdomain = host.split('.')[0];

        // Skip common non-tenant subdomains
        if (subdomain && !['www', 'api', 'app', 'localhost'].includes(subdomain)) {
            // In production, resolve subdomain to tenant ID
            // For now, use subdomain as tenant ID
            return subdomain;
        }
    }

    // Try JWT (future implementation)
    // const token = req.headers.get('authorization')?.replace('Bearer ', '');
    // if (token) {
    //   const decoded = verifyJWT(token);
    //   return decoded.tenantId;
    // }

    return null;
}

/**
 * Tenant isolation middleware
 * 
 * @param req - Next.js request
 * @param handler - Route handler
 * @returns Response
 */
export async function withTenantIsolation(
    req: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
    const tenantId = extractTenantId(req);

    if (!tenantId) {
        logger.warn('No tenant ID found in request', {
            url: req.url,
            headers: Object.fromEntries(req.headers.entries())
        });

        return NextResponse.json({
            success: false,
            error: 'MISSING_TENANT',
            message: 'Tenant ID is required. Provide x-tenant-id header or use tenant subdomain.'
        }, { status: 400 });
    }

    try {
        // Extract user ID and request ID for context
        const userId = req.headers.get('x-user-id') || undefined;
        const requestId = req.headers.get('x-request-id') || undefined;

        // Run handler with tenant context
        return await runWithTenant(
            tenantId,
            () => handler(req),
            { userId, requestId }
        );

    } catch (error: any) {
        if (error.name === 'TenantContextError') {
            return NextResponse.json({
                success: false,
                error: 'INVALID_TENANT',
                message: error.message
            }, { status: 404 });
        }

        if (error.name === 'QuotaExceededError') {
            return NextResponse.json({
                success: false,
                error: 'QUOTA_EXCEEDED',
                message: error.message,
                details: {
                    resource: error.resource,
                    limit: error.limit,
                    current: error.current
                }
            }, { status: 429 });
        }

        logger.error('Tenant isolation error', {
            tenantId,
            error: error.message,
            stack: error.stack
        });

        return NextResponse.json({
            success: false,
            error: 'TENANT_ERROR',
            message: 'Internal error processing tenant context'
        }, { status: 500 });
    }
}

/**
 * Wrapper for API routes with tenant isolation
 * 
 * Usage:
 * ```ts
 * import { withTenantIsolation } from '@/lib/middleware/tenant-isolation';
 * 
 * export const POST = tenantIsolated(async (req) => {
 *   // Tenant context is automatically set
 *   const tenant = getCurrentTenant();
 *   return Response.json({ tenantId: tenant.id });
 * });
 * ```
 */
export function tenantIsolated(
    handler: (req: Request) => Promise<Response>
) {
    return async (req: Request): Promise<Response> => {
        const nextReq = req as any as NextRequest;

        return withTenantIsolation(nextReq, async (_) => {
            const response = await handler(req);
            return new NextResponse(response.body, response);
        });
    };
}
