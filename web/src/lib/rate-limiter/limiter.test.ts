import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RateLimiter } from './limiter';
import { RATE_LIMIT_POLICIES } from './types';

// Mock ioredis
vi.mock('ioredis', () => {
    return {
        default: vi.fn().mockImplementation(() => ({
            multi: vi.fn().mockReturnThis(),
            get: vi.fn().mockReturnThis(),
            ttl: vi.fn().mockReturnThis(),
            exec: vi.fn(),
            setex: vi.fn(),
            incr: vi.fn(),
            del: vi.fn(),
            keys: vi.fn(),
            quit: vi.fn()
        }))
    };
});

import Redis from 'ioredis';

describe('RateLimiter', () => {
    let limiter: RateLimiter;
    let mockRedis: any;

    beforeEach(() => {
        limiter = new RateLimiter();
        mockRedis = (limiter as any).redis;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('checkLimit', () => {
        it('should allow first request', async () => {
            // Mock Redis returning no existing count
            mockRedis.multi.mockReturnValue({
                get: vi.fn().mockReturnThis(),
                ttl: vi.fn().mockReturnThis(),
                exec: vi.fn().mockResolvedValue([[null, null], [null, -2]])
            });

            mockRedis.setex = vi.fn().mockResolvedValue('OK');

            const result = await limiter.checkLimit(
                { type: 'apiKey', value: 'test-key-123' },
                '/api/v1/quotes'
            );

            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(119); // 120 burst - 1
            expect(mockRedis.setex).toHaveBeenCalled();
        });

        it('should allow requests under limit', async () => {
            // Mock Redis returning count of 10
            mockRedis.multi.mockReturnValue({
                get: vi.fn().mockReturnThis(),
                ttl: vi.fn().mockReturnThis(),
                exec: vi.fn().mockResolvedValue([[null, '10'], [null, 50]])
            });

            mockRedis.incr = vi.fn().mockResolvedValue(11);

            const result = await limiter.checkLimit(
                { type: 'apiKey', value: 'test-key-123' },
                '/api/v1/quotes'
            );

            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(109); // 120 - 11
            expect(mockRedis.incr).toHaveBeenCalled();
        });

        it('should reject request when limit exceeded', async () => {
            // Mock Redis returning count at burst limit
            mockRedis.multi.mockReturnValue({
                get: vi.fn().mockReturnThis(),
                ttl: vi.fn().mockReturnThis(),
                exec: vi.fn().mockResolvedValue([[null, '120'], [null, 30]])
            });

            const result = await limiter.checkLimit(
                { type: 'apiKey', value: 'test-key-123' },
                '/api/v1/quotes'
            );

            expect(result.allowed).toBe(false);
            expect(result.remaining).toBe(0);
            expect(result.retryAfter).toBe(30);
        });

        it('should use default policy for unknown endpoint', async () => {
            mockRedis.multi.mockReturnValue({
                get: vi.fn().mockReturnThis(),
                ttl: vi.fn().mockReturnThis(),
                exec: vi.fn().mockResolvedValue([[null, null], [null, -2]])
            });

            mockRedis.setex = vi.fn().mockResolvedValue('OK');

            const result = await limiter.checkLimit(
                { type: 'ip', value: '192.168.1.1' },
                '/api/v1/unknown'
            );

            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(249); // 250 burst - 1
        });

        it('should apply different limits per endpoint', async () => {
            mockRedis.multi.mockReturnValue({
                get: vi.fn().mockReturnThis(),
                ttl: vi.fn().mockReturnThis(),
                exec: vi.fn().mockResolvedValue([[null, null], [null, -2]])
            });

            mockRedis.setex = vi.fn().mockResolvedValue('OK');

            // Test bookings endpoint (lower limit)
            const resultBookings = await limiter.checkLimit(
                { type: 'apiKey', value: 'test-key' },
                '/api/v1/bookings'
            );

            expect(resultBookings.remaining).toBe(59); // 60 burst - 1

            // Reset mock
            vi.clearAllMocks();
            mockRedis.multi.mockReturnValue({
                get: vi.fn().mockReturnThis(),
                ttl: vi.fn().mockReturnThis(),
                exec: vi.fn().mockResolvedValue([[null, null], [null, -2]])
            });

            mockRedis.setex = vi.fn().mockResolvedValue('OK');

            // Test ARI endpoint (higher limit)
            const resultAri = await limiter.checkLimit(
                { type: 'apiKey', value: 'test-key' },
                '/api/v1/ari'
            );

            expect(resultAri.remaining).toBe(1199); // 1200 burst - 1
        });

        it('should isolate limits per client', async () => {
            mockRedis.multi.mockReturnValue({
                get: vi.fn().mockReturnThis(),
                ttl: vi.fn().mockReturnThis(),
                exec: vi.fn().mockResolvedValue([[null, null], [null, -2]])
            });

            mockRedis.setex = vi.fn().mockResolvedValue('OK');

            await limiter.checkLimit(
                { type: 'apiKey', value: 'key-1' },
                '/api/v1/quotes'
            );

            await limiter.checkLimit(
                { type: 'apiKey', value: 'key-2' },
                '/api/v1/quotes'
            );

            // Should have been called twice with different keys
            expect(mockRedis.setex).toHaveBeenCalledTimes(2);
        });
    });

    describe('resetLimit', () => {
        it('should reset limit for specific endpoint', async () => {
            mockRedis.del = vi.fn().mockResolvedValue(1);

            await limiter.resetLimit(
                { type: 'apiKey', value: 'test-key' },
                '/api/v1/quotes'
            );

            expect(mockRedis.del).toHaveBeenCalledWith('ratelimit:apiKey:test-key:/api/v1/quotes');
        });

        it('should reset all limits for client', async () => {
            mockRedis.keys = vi.fn().mockResolvedValue([
                'ratelimit:apiKey:test-key:/api/v1/quotes',
                'ratelimit:apiKey:test-key:/api/v1/bookings'
            ]);

            mockRedis.del = vi.fn().mockResolvedValue(2);

            await limiter.resetLimit({ type: 'apiKey', value: 'test-key' });

            expect(mockRedis.keys).toHaveBeenCalledWith('ratelimit:apiKey:test-key:*');
            expect(mockRedis.del).toHaveBeenCalled();
        });
    });

    describe('getUsage', () => {
        it('should return current usage', async () => {
            mockRedis.multi.mockReturnValue({
                get: vi.fn().mockReturnThis(),
                ttl: vi.fn().mockReturnThis(),
                exec: vi.fn().mockResolvedValue([[null, '45'], [null, 30]])
            });

            const usage = await limiter.getUsage(
                { type: 'apiKey', value: 'test-key' },
                '/api/v1/quotes'
            );

            expect(usage.count).toBe(45);
            expect(usage.ttl).toBe(30);
        });

        it('should return zero for unused limit', async () => {
            mockRedis.multi.mockReturnValue({
                get: vi.fn().mockReturnThis(),
                ttl: vi.fn().mockReturnThis(),
                exec: vi.fn().mockResolvedValue([[null, null], [null, -2]])
            });

            const usage = await limiter.getUsage(
                { type: 'ip', value: '192.168.1.1' },
                '/api/v1/bookings'
            );

            expect(usage.count).toBe(0);
            expect(usage.ttl).toBe(0);
        });
    });
});
