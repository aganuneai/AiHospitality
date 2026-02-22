/**
 * API Versioning Strategy
 * 
 * Implements versioning for API endpoints to support:
 * - Backward compatibility
 * - Gradual deprecation
 * - Multiple API versions simultaneously
 * - Version negotiation via headers or URL path
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '../logger';

/**
 * API version definition
 */
export interface APIVersion {
    version: string;
    status: 'current' | 'supported' | 'deprecated' | 'sunset';
    releaseDate: Date;
    supportUntil?: Date;
    sunsetDate?: Date;
    deprecationNotice?: string;
}

/**
 * Available API versions
 */
export const API_VERSIONS: Record<string, APIVersion> = {
    'v1': {
        version: 'v1',
        status: 'current',
        releaseDate: new Date('2026-01-01'),
        deprecationNotice: undefined
    },
    'v2': {
        version: 'v2',
        status: 'supported',
        releaseDate: new Date('2026-06-01'),
        deprecationNotice: 'v2 will be sunset on 2027-06-01'
    }
};

/**
 * Default version (if not specified)
 */
export const DEFAULT_API_VERSION = 'v1';

/**
 * API Versioning Middleware
 */
export class APIVersioning {

    /**
     * Extract API version from request
     * 
     * Priority:
     * 1. URL path (/api/v1/...)
     * 2. Accept header (Accept: application/vnd.aihospitality.v1+json)
     * 3. X-API-Version header
     * 4. Default version
     * 
     * @param req - Next.js request
     */
    extractVersion(req: NextRequest): string {
        // 1. Check URL path
        const urlPath = req.nextUrl.pathname;
        const pathMatch = urlPath.match(/\/api\/(v\d+)\//);
        if (pathMatch) {
            return pathMatch[1];
        }

        // 2. Check Accept header
        const acceptHeader = req.headers.get('Accept');
        if (acceptHeader) {
            const acceptMatch = acceptHeader.match(/application\/vnd\.aihospitality\.(v\d+)\+json/);
            if (acceptMatch) {
                return acceptMatch[1];
            }
        }

        // 3. Check X-API-Version header
        const versionHeader = req.headers.get('X-API-Version');
        if (versionHeader) {
            return versionHeader;
        }

        // 4. Default
        return DEFAULT_API_VERSION;
    }

    /**
     * Validate API version
     * 
     * @param version - Version string (e.g., 'v1')
     */
    validateVersion(version: string): {
        valid: boolean;
        error?: string;
        versionInfo?: APIVersion;
    } {
        const versionInfo = API_VERSIONS[version];

        if (!versionInfo) {
            return {
                valid: false,
                error: `Unsupported API version: ${version}. Supported versions: ${Object.keys(API_VERSIONS).join(', ')}`
            };
        }

        // Check if version is sunset
        if (versionInfo.status === 'sunset' && versionInfo.sunsetDate) {
            const now = new Date();
            if (now > versionInfo.sunsetDate) {
                return {
                    valid: false,
                    error: `API version ${version} has been sunset as of ${versionInfo.sunsetDate.toISOString()}. Please upgrade to a newer version.`
                };
            }
        }

        return {
            valid: true,
            versionInfo
        };
    }

    /**
     * Add version-related headers to response
     * 
     * @param version - API version
     * @param response - Next.js response
     */
    addVersionHeaders(version: string, response: NextResponse): void {
        const versionInfo = API_VERSIONS[version];

        if (!versionInfo) return;

        // Add version header
        response.headers.set('X-API-Version', version);

        // Add deprecation warning if applicable
        if (versionInfo.status === 'deprecated' && versionInfo.deprecationNotice) {
            response.headers.set('Deprecation', 'true');
            response.headers.set('X-API-Deprecation-Notice', versionInfo.deprecationNotice);

            if (versionInfo.sunsetDate) {
                response.headers.set('Sunset', versionInfo.sunsetDate.toUTCString());
            }
        }

        // Add supported versions
        response.headers.set(
            'X-API-Supported-Versions',
            Object.keys(API_VERSIONS)
                .filter(v => API_VERSIONS[v].status !== 'sunset')
                .join(', ')
        );
    }

    /**
     * Middleware function for Next.js
     * 
     * Usage in middleware.ts:
     * ```typescript
     * export function middleware(request: NextRequest) {
     *   return apiV ersioning.middleware(request);
     * }
     * ```
     */
    middleware(req: NextRequest): NextResponse | null {
        // Only process API routes
        if (!req.nextUrl.pathname.startsWith('/api/')) {
            return null;
        }

        const version = this.extractVersion(req);
        const validation = this.validateVersion(version);

        logger.info('API version request', {
            path: req.nextUrl.pathname,
            version,
            valid: validation.valid
        });

        // If invalid version, return error
        if (!validation.valid) {
            return NextResponse.json(
                {
                    error: {
                        code: 'UNSUPPORTED_API_VERSION',
                        message: validation.error
                    }
                },
                { status: 400 }
            );
        }

        // Create response (or pass through)
        const response = NextResponse.next();

        // Add version headers
        this.addVersionHeaders(version, response);

        return response;
    }

    /**
     * Create version-specific router
     * 
     * @param version - API version
     * @param handler - Handler function for this version
     */
    versionedHandler(
        version: string,
        handler: (req: NextRequest) => Promise<NextResponse>
    ): (req: NextRequest) => Promise<NextResponse> {
        return async (req: NextRequest) => {
            const requestVersion = this.extractVersion(req);

            // Check if request is for this version
            if (requestVersion !== version) {
                return NextResponse.json(
                    {
                        error: {
                            code: 'VERSION_MISMATCH',
                            message: `This endpoint is for API ${version}, but you requested ${requestVersion}`
                        }
                    },
                    { status: 400 }
                );
            }

            // Execute handler
            const response = await handler(req);

            // Add version headers
            this.addVersionHeaders(version, response);

            return response;
        };
    }

    /**
     * Get all supported versions
     */
    getSupportedVersions(): APIVersion[] {
        return Object.values(API_VERSIONS)
            .filter(v => v.status !== 'sunset')
            .sort((a, b) => b.releaseDate.getTime() - a.releaseDate.getTime());
    }

    /**
     * Check if version requires migration
     * 
     * @param currentVersion - Current version being used
     */
    requiresMigration(currentVersion: string): {
        required: boolean;
        targetVersion?: string;
        reason?: string;
        deadline?: Date;
    } {
        const versionInfo = API_VERSIONS[currentVersion];

        if (!versionInfo) {
            return {
                required: true,
                targetVersion: DEFAULT_API_VERSION,
                reason: 'Unknown version'
            };
        }

        if (versionInfo.status === 'sunset' || versionInfo.status === 'deprecated') {
            // Find next supported version
            const supportedVersions = this.getSupportedVersions();
            const newerVersion = supportedVersions.find(
                v => new Date(v.releaseDate) > new Date(versionInfo.releaseDate)
            );

            return {
                required: true,
                targetVersion: newerVersion?.version || DEFAULT_API_VERSION,
                reason: versionInfo.status === 'sunset'
                    ? 'Version has been sunset'
                    : 'Version is deprecated',
                deadline: versionInfo.sunsetDate
            };
        }

        return {
            required: false
        };
    }
}

/**
 * Singleton instance
 */
export const apiVersioning = new APIVersioning();

/**
 * Breaking changes tracking
 */
export const BREAKING_CHANGES: Record<string, string[]> = {
    'v2': [
        'Changed date format from MM/DD/YYYY to ISO 8601 (YYYY-MM-DD)',
        'Renamed field: guestInfo -> guest',
        'Removed deprecated endpoint: POST /api/bookings (use POST /api/reservations)',
        'Changed error response structure (added details array)',
        'Minimum TLS version is now 1.2'
    ]
};

/**
 * Migration guide generator
 */
export function generateMigrationGuide(
    fromVersion: string,
    toVersion: string
): {
    breakingChanges: string[];
    steps: string[];
    estimatedEffort: string;
} {
    const from = parseInt(fromVersion.replace('v', ''));
    const to = parseInt(toVersion.replace('v', ''));

    // Collect all breaking changes between versions
    const allChanges: string[] = [];
    for (let v = from + 1; v <= to; v++) {
        const versionKey = `v${v}`;
        if (BREAKING_CHANGES[versionKey]) {
            allChanges.push(...BREAKING_CHANGES[versionKey]);
        }
    }

    const steps = [
        'Review breaking changes list below',
        'Update client code to handle new response structures',
        'Update date handling to use ISO 8601 format',
        'Test thoroughly in staging environment',
        'Update API version in production',
        'Monitor error logs for unexpected issues'
    ];

    // Estimate effort based on number of breaking changes
    let effort = 'Low';
    if (allChanges.length > 5) effort = 'Medium';
    if (allChanges.length > 10) effort = 'High';

    return {
        breakingChanges: allChanges,
        steps,
        estimatedEffort: effort
    };
}
