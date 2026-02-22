/**
 * Context Validator
 * 
 * Validates API request context headers.
 * Ensures all required fields are present and valid.
 */

import {
    ContextEnvelope,
    ContextDomain,
    ContextError,
    ContextValidationResult,
    DOMAIN_REQUIREMENTS
} from './types';

/**
 * Extract context from HTTP headers
 * 
 * @param headers - Request headers
 * @returns Extracted context or validation error
 */
export function extractContext(
    headers: Headers | Record<string, string>
): ContextValidationResult {
    // Helper to get header value
    const getHeader = (key: string): string | null => {
        if (headers instanceof Headers) {
            return headers.get(key);
        }
        return headers[key] || headers[key.toLowerCase()] || null;
    };

    // 1. Extract hotel ID
    const hotelId = getHeader('x-hotel-id');
    if (!hotelId) {
        return {
            valid: false,
            error: ContextError.MISSING_HOTEL_ID,
            message: 'Header "x-hotel-id" is required'
        };
    }

    // Validate hotel ID format (basic UUID check)
    if (!isValidId(hotelId)) {
        return {
            valid: false,
            error: ContextError.INVALID_HOTEL_ID,
            message: 'Invalid hotel ID format'
        };
    }

    // 2. Extract domain
    const domainStr = getHeader('x-domain');
    if (!domainStr) {
        return {
            valid: false,
            error: ContextError.MISSING_DOMAIN,
            message: 'Header "x-domain" is required'
        };
    }

    // Validate domain
    const domain = domainStr.toUpperCase() as ContextDomain;
    if (!Object.values(ContextDomain).includes(domain)) {
        return {
            valid: false,
            error: ContextError.INVALID_DOMAIN,
            message: `Invalid domain. Must be one of: ${Object.values(ContextDomain).join(', ')}`
        };
    }

    // 3. Extract app key
    const appKey = getHeader('x-app-key');
    if (!appKey) {
        return {
            valid: false,
            error: ContextError.MISSING_APP_KEY,
            message: 'Header "x-app-key" is required for authentication'
        };
    }

    // 4. Extract optional fields based on domain requirements
    const requirements = DOMAIN_REQUIREMENTS[domain];

    const channelCode = getHeader('x-channel-code');
    if (requirements.requiresChannelCode && !channelCode) {
        return {
            valid: false,
            error: ContextError.MISSING_CHANNEL_CODE,
            message: `Header "x-channel-code" is required for domain ${domain}`
        };
    }

    const hubId = getHeader('x-hub-id');
    if (requirements.requiresHubId && !hubId) {
        return {
            valid: false,
            error: ContextError.MISSING_HUB_ID,
            message: `Header "x-hub-id" is required for domain ${domain}`
        };
    }

    // 5. Extract metadata
    const userAgent = getHeader('user-agent');
    const ipAddress = getHeader('x-forwarded-for') || getHeader('x-real-ip');

    // Build context envelope
    const context: ContextEnvelope = {
        hotelId,
        domain,
        appKey,
        channelCode: channelCode || undefined,
        hubId: hubId || undefined,
        userAgent: userAgent || undefined,
        ipAddress: ipAddress || undefined
    };

    return {
        valid: true,
        context
    };
}

/**
 * Validate if a string is a valid ID (UUID or similar)
 * 
 * @param id - ID string to validate
 * @returns True if valid
 */
function isValidId(id: string): boolean {
    // Basic validation: not empty, reasonable length, alphanumeric with dashes
    if (!id || id.length < 3 || id.length > 100) {
        return false;
    }

    // Allow UUIDs, short codes, and alphanumeric IDs
    const validPattern = /^[a-zA-Z0-9-_]+$/;
    return validPattern.test(id);
}

/**
 * Validate app key (placeholder - replace with real auth)
 * 
 * In production, this should:
 * - Query database for valid API keys
 * - Check rate limits
 * - Verify permissions for the hotel
 * 
 * @param appKey - Application API key
 * @param hotelId - Hotel ID to validate access for
 * @returns True if authorized
 */
export async function validateAppKey(
    appKey: string,
    hotelId: string
): Promise<boolean> {
    // TODO: Implement real API key validation
    // For MVP, accept any non-empty key

    if (!appKey || appKey.length < 10) {
        return false;
    }

    // In production:
    // const apiKey = await prisma.apiKey.findUnique({ 
    //   where: { key: appKey },
    //   include: { permissions: true }
    // });
    // return apiKey && apiKey.properties.includes(hotelId);

    return true; // MVP: always valid
}

/**
 * Attach context to request object
 * 
 * @param req - Request object
 * @param context - Context envelope to attach
 */
export function attachContext(req: any, context: ContextEnvelope): void {
    req.context = context;
}

/**
 * Get context from request object
 * 
 * @param req - Request object
 * @returns Context envelope or undefined
 */
export function getContext(req: any): ContextEnvelope | undefined {
    return req.context;
}
