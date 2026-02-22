/**
 * Redis Rate Limiter
 * 
 * Token bucket implementation with Redis persistence.
 * Supports distributed rate limiting across multiple instances.
 */

import Redis from 'ioredis';
import {
    RateLimitPolicy,
    RateLimitResult,
    ClientIdentifier,
    RATE_LIMIT_POLICIES
} from './types';

export class RateLimiter {
    private redis: Redis;
    private keyPrefix = 'ratelimit:';

    constructor(redisUrl?: string) {
        this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
    }

    /**
     * Check if request is allowed under rate limit
     * 
     * Uses token bucket algorithm:
     * - Each client gets a bucket of tokens
     * - Tokens refill at a constant rate
     * - Request consumes 1 token
     * - If no tokens available, request is rejected
     * 
     * @param client - Client identifier
     * @param endpoint - API endpoint path
     * @returns Rate limit result
     */
    async checkLimit(
        client: ClientIdentifier,
        endpoint: string
    ): Promise<RateLimitResult> {
        // Get policy for endpoint (or default)
        const policy = this.getPolicyForEndpoint(endpoint);

        // Generate Redis key
        const key = this.generateKey(client, endpoint);

        // Current timestamp
        const now = Math.floor(Date.now() / 1000);

        // Use Redis transaction for atomic operations
        const result = await this.redis
            .multi()
            .get(key)
            .ttl(key)
            .exec();

        if (!result) {
            throw new Error('Redis transaction failed');
        }

        const [[, currentCount], [, ttl]] = result as [[null, string | null], [null, number]];

        const count = currentCount ? parseInt(currentCount, 10) : 0;
        const windowEnd = ttl > 0 ? now + ttl : now + policy.window;

        // Check if limit exceeded
        const limit = policy.burst || policy.requests;

        if (count >= limit) {
            // Limit exceeded
            return {
                allowed: false,
                remaining: 0,
                resetAt: new Date(windowEnd * 1000),
                retryAfter: ttl > 0 ? ttl : policy.window
            };
        }

        // Increment counter
        const newCount = count + 1;

        if (count === 0) {
            // First request in window, set with expiry
            await this.redis.setex(key, policy.window, newCount.toString());
        } else {
            // Increment existing counter
            await this.redis.incr(key);
        }

        return {
            allowed: true,
            remaining: limit - newCount,
            resetAt: new Date(windowEnd * 1000)
        };
    }

    /**
     * Get policy for endpoint
     * 
     * @param endpoint - API endpoint
     * @returns Rate limit policy
     */
    private getPolicyForEndpoint(endpoint: string): RateLimitPolicy {
        // Normalize endpoint (remove query params)
        const normalized = endpoint.split('?')[0];

        // Check exact match
        if (RATE_LIMIT_POLICIES[normalized]) {
            return RATE_LIMIT_POLICIES[normalized];
        }

        // Check prefix match (for dynamic routes like /api/v1/bookings/:id)
        for (const [pattern, policy] of Object.entries(RATE_LIMIT_POLICIES)) {
            if (pattern !== 'default' && normalized.startsWith(pattern)) {
                return policy;
            }
        }

        // Default policy
        return RATE_LIMIT_POLICIES.default;
    }

    /**
     * Generate Redis key for rate limiting
     * 
     * @param client - Client identifier
     * @param endpoint - API endpoint
     * @returns Redis key
     */
    private generateKey(client: ClientIdentifier, endpoint: string): string {
        const normalized = endpoint.split('?')[0];
        return `${this.keyPrefix}${client.type}:${client.value}:${normalized}`;
    }

    /**
     * Reset rate limit for a client
     * 
     * Useful for testing or manual intervention.
     * 
     * @param client - Client identifier
     * @param endpoint - API endpoint (optional, resets all if not provided)
     */
    async resetLimit(client: ClientIdentifier, endpoint?: string): Promise<void> {
        if (endpoint) {
            const key = this.generateKey(client, endpoint);
            await this.redis.del(key);
        } else {
            // Reset all limits for this client
            const pattern = `${this.keyPrefix}${client.type}:${client.value}:*`;
            const keys = await this.redis.keys(pattern);
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
        }
    }

    /**
     * Get current usage for a client
     * 
     * @param client - Client identifier
     * @param endpoint - API endpoint
     * @returns Current request count and TTL
     */
    async getUsage(
        client: ClientIdentifier,
        endpoint: string
    ): Promise<{ count: number; ttl: number }> {
        const key = this.generateKey(client, endpoint);

        const result = await this.redis
            .multi()
            .get(key)
            .ttl(key)
            .exec();

        if (!result) {
            return { count: 0, ttl: 0 };
        }

        const [[, currentCount], [, ttl]] = result as [[null, string | null], [null, number]];

        return {
            count: currentCount ? parseInt(currentCount, 10) : 0,
            ttl: ttl > 0 ? ttl : 0
        };
    }

    /**
     * Close Redis connection
     */
    async close(): Promise<void> {
        await this.redis.quit();
    }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();
