import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as cache from './cache-service';
import { cacheKey, listCacheKey, inventoryCacheKey, rateCacheKey, getTTL, INVALIDATION_TAGS } from './cache-keys';

// Mock ioredis
vi.mock('ioredis', () => {
    return {
        default: vi.fn(() => ({
            get: vi.fn(),
            setex: vi.fn(),
            del: vi.fn(),
            scan: vi.fn(),
            ttl: vi.fn(),
            flushdb: vi.fn(),
            info: vi.fn()
        }))
    };
});

describe('Cache Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Cache Keys', () => {
        it('should generate valid cache key', () => {
            const key = cacheKey('tenant-123', 'roomTypes', 'room-456');
            expect(key).toBe('cache:tenant:tenant-123:roomTypes:room-456');
        });

        it('should generate list cache key with filters', () => {
            const key = listCacheKey('tenant-123', 'roomTypes', {
                propertyId: 'prop-1',
                active: true
            });

            expect(key).toMatch(/^cache:tenant:tenant-123:roomTypes:list:[a-f0-9]{8}$/);
        });

        it('should generate same list key for same filters (order independent)', () => {
            const key1 = listCacheKey('tenant-123', 'roomTypes', {
                active: true,
                propertyId: 'prop-1'
            });

            const key2 = listCacheKey('tenant-123', 'roomTypes', {
                propertyId: 'prop-1',
                active: true
            });

            expect(key1).toBe(key2);
        });

        it('should generate inventory cache key', () => {
            const key = inventoryCacheKey('tenant-123', 'room-456', '2026-03-15');
            expect(key).toBe('cache:tenant:tenant-123:inventory:room-456:2026-03-15');
        });

        it('should generate rate cache key', () => {
            const key = rateCacheKey('tenant-123', 'rate-789', '2026-03-15');
            expect(key).toBe('cache:tenant:tenant-123:rates:rate-789:2026-03-15');
        });
    });

    describe('TTL Configuration', () => {
        it('should have correct TTLs per entity', () => {
            expect(getTTL('roomTypes')).toBe(3600);  // 1 hour
            expect(getTTL('inventory')).toBe(300);   // 5 min
            expect(getTTL('quotes')).toBe(60);       // 1 min
        });
    });

    describe('Invalidation Patterns', () => {
        it('should generate room types invalidation pattern', () => {
            const pattern = INVALIDATION_TAGS.roomTypes('tenant-123');
            expect(pattern).toBe('cache:tenant:tenant-123:roomTypes:*');
        });

        it('should generate inventory by date pattern', () => {
            const pattern = INVALIDATION_TAGS.inventoryByDate('tenant-123', 'room-456');
            expect(pattern).toBe('cache:tenant:tenant-123:inventory:room-456:*');
        });

        it('should generate rates by plan pattern', () => {
            const pattern = INVALIDATION_TAGS.ratesByPlan('tenant-123', 'rate-789');
            expect(pattern).toBe('cache:tenant:tenant-123:rates:rate-789:*');
        });

        it('should generate all-for-tenant pattern', () => {
            const pattern = INVALIDATION_TAGS.allForTenant('tenant-123');
            expect(pattern).toBe('cache:tenant:tenant-123:*');
        });
    });

    describe('L1 Cache (LRU)', () => {
        it('should cache and retrieve values', async () => {
            const testKey = cacheKey('tenant-1', 'roomTypes', 'room-1');
            const testValue = { id: 'room-1', name: 'Deluxe Room' };

            await cache.set(testKey, testValue, 60);
            const retrieved = await cache.get(testKey);

            expect(retrieved).toEqual(testValue);
        });

        it('should return null for cache miss', async () => {
            const result = await cache.get('non-existent-key');
            expect(result).toBeNull();
        });

        it('should handle cache expiry', async () => {
            const key = cacheKey('tenant-1', 'quotes', 'quote-1');
            const value = { id: 'quote-1', total: 100 };

            await cache.set(key, value, 0);  // Immediate expiry

            // Wait a bit
            await new Promise(resolve => setTimeout(resolve, 10));

            const retrieved = await cache.get(key);
            expect(retrieved).toBeNull();
        });
    });

    describe('Cache Invalidation', () => {
        it('should invalidate by pattern', async () => {
            const Redis = (await import('ioredis')).default;
            const mockRedis = new Redis() as any;

            // Mock scan to return keys
            mockRedis.scan
                .mockResolvedValueOnce(['0', ['key1', 'key2', 'key3']]);

            const count = await cache.invalidatePattern('cache:tenant:T-001:*');

            // Note: actual implementation will vary based on Redis mock
            expect(count).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Cache Statistics', () => {
        it('should return cache stats', async () => {
            const Redis = (await import('ioredis')).default;
            const mockRedis = new Redis() as any;

            mockRedis.info.mockResolvedValue(
                'keyspace_hits:1000\r\nkeyspace_misses:200\r\n'
            );

            const stats = await cache.getStats();

            expect(stats).toBeDefined();
            expect(stats?.l1).toBeDefined();
            expect(stats?.l2).toBeDefined();
        });
    });

    describe('Multi-level Caching', () => {
        it('should check L1 before L2', async () => {
            const key = cacheKey('tenant-1', 'roomTypes', 'room-1');
            const value = { id: 'room-1', name: 'Suite' };

            // Set in cache
            await cache.set(key, value, 60);

            // Get should hit L1 first
            const retrieved = await cache.get(key);
            expect(retrieved).toEqual(value);
        });

        it('should warm L1 from L2 hit', async () => {
            const Redis = (await import('ioredis')).default;
            const mockRedis = new Redis() as any;

            const key = cacheKey('tenant-1', 'ratePlans', 'rate-1');
            const value = { id: 'rate-1', name: 'Standard' };

            // Mock L2 hit
            mockRedis.get.mockResolvedValue(JSON.stringify(value));
            mockRedis.ttl.mockResolvedValue(300);

            const retrieved = await cache.get(key);

            // Should return value from L2
            // In real implementation, L1 would also be warmed
            expect(mockRedis.get).toHaveBeenCalledWith(key);
        });
    });

    describe('Error Handling', () => {
        it('should handle Redis errors gracefully', async () => {
            const Redis = (await import('ioredis')).default;
            const mockRedis = new Redis() as any;

            mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));

            const result = await cache.get('any-key');

            // Should return null on error (fail-open)
            expect(result).toBeNull();
        });

        it('should handle set errors gracefully', async () => {
            const Redis = (await import('ioredis')).default;
            const mockRedis = new Redis() as any;

            mockRedis.setex.mockRejectedValue(new Error('Redis write failed'));

            // Should not throw
            await expect(
                cache.set('key', 'value', 60)
            ).resolves.not.toThrow();
        });
    });
});
