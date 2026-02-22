/**
 * Cache Service
 * 
 * Multi-level caching strategy:
 * - L1: In-memory (LRU cache)
 * - L2: Redis (distributed)
 * 
 * Features:
 * - TTL per entity type
 * - Tag-based invalidation
 * - Tenant isolation
 */

import Redis from 'ioredis';
import { logger } from '../logger';

/**
 * Cache configuration
 */
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

/**
 * L1 cache (in-memory LRU)
 */
class LRUCache<T> {
    private cache = new Map<string, { value: T; expiry: number }>();
    private maxSize: number;

    constructor(maxSize: number = 1000) {
        this.maxSize = maxSize;
    }

    get(key: string): T | null {
        const entry = this.cache.get(key);

        if (!entry) return null;

        // Check expiry
        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            return null;
        }

        // Move to end (LRU)
        this.cache.delete(key);
        this.cache.set(key, entry);

        return entry.value;
    }

    set(key: string, value: T, ttlSeconds: number): void {
        // Evict oldest if at capacity
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }

        this.cache.set(key, {
            value,
            expiry: Date.now() + ttlSeconds * 1000
        });
    }

    delete(key: string): void {
        this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }

    size(): number {
        return this.cache.size;
    }
}

/**
 * L1 caches per entity type
 */
const l1Caches = {
    roomTypes: new LRUCache(100),
    ratePlans: new LRUCache(200),
    inventory: new LRUCache(500),
    rates: new LRUCache(500),
    restrictions: new LRUCache(300),
    quotes: new LRUCache(1000)
};

/**
 * Get from cache (L1 → L2)
 * 
 * @param key - Cache key
 * @returns Cached value or null
 */
export async function get<T>(key: string): Promise<T | null> {
    // Try L1 first
    const entityType = key.split(':')[2] as keyof typeof l1Caches;
    const l1Cache = l1Caches[entityType];

    if (l1Cache) {
        const l1Value = l1Cache.get(key);
        if (l1Value !== null) {
            logger.debug('Cache hit (L1)', { key });
            return l1Value as T;
        }
    }

    // Try L2 (Redis)
    try {
        const l2Value = await redis.get(key);

        if (l2Value) {
            const parsed = JSON.parse(l2Value) as T;

            // Warm L1
            if (l1Cache) {
                const ttl = await redis.ttl(key);
                l1Cache.set(key, parsed, ttl > 0 ? ttl : 60);
            }

            logger.debug('Cache hit (L2)', { key });
            return parsed;
        }

        logger.debug('Cache miss', { key });
        return null;

    } catch (error: any) {
        logger.warn('Cache get error', {
            key,
            error: error.message
        });
        return null;
    }
}

/**
 * Set cache value (L1 + L2)
 * 
 * @param key - Cache key
 * @param value - Value to cache
 * @param ttlSeconds - TTL in seconds
 */
export async function set<T>(
    key: string,
    value: T,
    ttlSeconds: number
): Promise<void> {
    const entityType = key.split(':')[2] as keyof typeof l1Caches;
    const l1Cache = l1Caches[entityType];

    // Set L1
    if (l1Cache) {
        l1Cache.set(key, value, ttlSeconds);
    }

    // Set L2 (Redis)
    try {
        await redis.setex(
            key,
            ttlSeconds,
            JSON.stringify(value)
        );

        logger.debug('Cache set', {
            key,
            ttl: ttlSeconds
        });

    } catch (error: any) {
        logger.warn('Cache set error', {
            key,
            error: error.message
        });
    }
}

/**
 * Delete cache key
 * 
 * @param key - Cache key
 */
export async function del(key: string): Promise<void> {
    const entityType = key.split(':')[2] as keyof typeof l1Caches;
    const l1Cache = l1Caches[entityType];

    // Delete from L1
    if (l1Cache) {
        l1Cache.delete(key);
    }

    // Delete from L2
    try {
        await redis.del(key);
        logger.debug('Cache deleted', { key });
    } catch (error: any) {
        logger.warn('Cache delete error', {
            key,
            error: error.message
        });
    }
}

/**
 * Invalidate by pattern (Redis SCAN)
 * 
 * @param pattern - Key pattern (e.g., "cache:tenant:T-001:*")
 */
export async function invalidatePattern(pattern: string): Promise<number> {
    try {
        const keys: string[] = [];
        let cursor = '0';

        // Scan for matching keys
        do {
            const [newCursor, foundKeys] = await redis.scan(
                cursor,
                'MATCH',
                pattern,
                'COUNT',
                100
            );

            cursor = newCursor;
            keys.push(...foundKeys);
        } while (cursor !== '0');

        // Delete all matching keys
        if (keys.length > 0) {
            await redis.del(...keys);

            // Clear L1 caches
            Object.values(l1Caches).forEach(cache => cache.clear());

            logger.info('Cache invalidated by pattern', {
                pattern,
                count: keys.length
            });
        }

        return keys.length;

    } catch (error: any) {
        logger.warn('Cache invalidation error', {
            pattern,
            error: error.message
        });
        return 0;
    }
}

/**
 * Invalidate by tags
 * 
 * @param tags - Tags to invalidate
 */
export async function invalidateByTags(tags: string[]): Promise<void> {
    for (const tag of tags) {
        await invalidatePattern(`cache:*:${tag}:*`);
    }
}

/**
 * Get cache statistics
 * 
 * @returns Cache stats
 */
export async function getStats() {
    try {
        const info = await redis.info('stats');
        const lines = info.split('\r\n');

        const stats: Record<string, any> = {};

        lines.forEach(line => {
            const [key, value] = line.split(':');
            if (key && value) {
                stats[key] = value;
            }
        });

        return {
            l1: {
                roomTypes: l1Caches.roomTypes.size(),
                ratePlans: l1Caches.ratePlans.size(),
                inventory: l1Caches.inventory.size(),
                rates: l1Caches.rates.size(),
                restrictions: l1Caches.restrictions.size(),
                quotes: l1Caches.quotes.size()
            },
            l2: {
                keyspace_hits: stats.keyspace_hits || '0',
                keyspace_misses: stats.keyspace_misses || '0',
                hit_rate: calculateHitRate(stats)
            }
        };

    } catch (error: any) {
        logger.warn('Cache stats error', {
            error: error.message
        });
        return null;
    }
}

/**
 * Calculate cache hit rate
 */
function calculateHitRate(stats: Record<string, string>): string {
    const hits = parseInt(stats.keyspace_hits || '0');
    const misses = parseInt(stats.keyspace_misses || '0');
    const total = hits + misses;

    if (total === 0) return '0%';

    const rate = ((hits / total) * 100).toFixed(2);
    return `${rate}%`;
}

/**
 * Warm cache
 * 
 * Pre-populate cache with frequently accessed data.
 * 
 * @param tenantId - Tenant ID
 */
export async function warmCache(tenantId: string): Promise<void> {
    logger.info('Warming cache', { tenantId });

    // Implementation depends on data access patterns
    // For example, cache all room types and rate plans

    // TODO: Implement cache warming logic
}

/**
 * Clear all caches
 */
export async function clearAll(): Promise<void> {
    // Clear L1
    Object.values(l1Caches).forEach(cache => cache.clear());

    // Clear L2
    try {
        await redis.flushdb();
        logger.info('All caches cleared');
    } catch (error: any) {
        logger.warn('Cache clear error', {
            error: error.message
        });
    }
}
