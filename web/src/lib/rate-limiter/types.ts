/**
 * Rate Limiter Types
 * 
 * Token bucket algorithm for API rate limiting.
 */

/**
 * Rate limit policy configuration
 */
export interface RateLimitPolicy {
    requests: number;      // Max requests allowed
    window: number;        // Time window in seconds
    burst?: number;        // Allow burst above limit (optional)
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
    allowed: boolean;
    remaining: number;     // Requests remaining in window
    resetAt: Date;         // When the limit resets
    retryAfter?: number;   // Seconds to wait if rejected (429)
}

/**
 * Client identifier for rate limiting
 */
export interface ClientIdentifier {
    type: 'ip' | 'apiKey' | 'user';
    value: string;
}

/**
 * Rate limit policies per endpoint
 */
export const RATE_LIMIT_POLICIES: Record<string, RateLimitPolicy> = {
    // High-traffic endpoints
    '/api/v1/quotes': {
        requests: 100,
        window: 60,
        burst: 120
    },

    // Critical operations
    '/api/v1/bookings': {
        requests: 50,
        window: 60,
        burst: 60
    },

    // Bulk operations (higher limit)
    '/api/v1/ari/bulk': {
        requests: 20,
        window: 60
    },

    // Standard ARI updates
    '/api/v1/ari': {
        requests: 1000,
        window: 60,
        burst: 1200
    },

    // Metrics (read-only, higher limit)
    '/api/v1/metrics': {
        requests: 200,
        window: 60
    },

    // Default policy for unlisted endpoints
    'default': {
        requests: 200,
        window: 60,
        burst: 250
    }
};
