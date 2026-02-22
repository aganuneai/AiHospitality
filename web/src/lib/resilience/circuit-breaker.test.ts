import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CircuitBreaker } from './circuit-breaker';
import { CircuitState } from './types';

describe('CircuitBreaker', () => {
    let circuit: CircuitBreaker;

    beforeEach(() => {
        circuit = new CircuitBreaker('test-circuit', {
            failureThreshold: 3,
            successThreshold: 2,
            timeout: 1000
        });
    });

    describe('State: CLOSED', () => {
        it('should start in CLOSED state', () => {
            expect(circuit.getState()).toBe(CircuitState.CLOSED);
        });

        it('should execute function successfully', async () => {
            const fn = vi.fn().mockResolvedValue('success');

            const result = await circuit.execute(fn);

            expect(result).toBe('success');
            expect(fn).toHaveBeenCalledTimes(1);
            expect(circuit.getState()).toBe(CircuitState.CLOSED);
        });

        it('should transition to OPEN after failure threshold', async () => {
            const fn = vi.fn().mockRejectedValue(new Error('Failed'));

            // Fail 3 times (threshold)
            for (let i = 0; i < 3; i++) {
                try {
                    await circuit.execute(fn);
                } catch (e) {
                    // Expected
                }
            }

            expect(circuit.getState()).toBe(CircuitState.OPEN);
            const metrics = circuit.getMetrics();
            expect(metrics.consecutiveFailures).toBe(3);
        });

        it('should reset failure count on success', async () => {
            const failFn = vi.fn().mockRejectedValue(new Error('Failed'));
            const successFn = vi.fn().mockResolvedValue('success');

            // Fail twice
            try { await circuit.execute(failFn); } catch (e) { }
            try { await circuit.execute(failFn); } catch (e) { }

            // Then succeed
            await circuit.execute(successFn);

            // Should still be CLOSED with failure count reset
            expect(circuit.getState()).toBe(CircuitState.CLOSED);
            const metrics = circuit.getMetrics();
            expect(metrics.consecutiveFailures).toBe(0);
        });
    });

    describe('State: OPEN', () => {
        beforeEach(async () => {
            // Force circuit to OPEN
            const fn = vi.fn().mockRejectedValue(new Error('Failed'));
            for (let i = 0; i < 3; i++) {
                try { await circuit.execute(fn); } catch (e) { }
            }
        });

        it('should reject requests immediately in OPEN state', async () => {
            const fn = vi.fn().mockResolvedValue('success');

            await expect(circuit.execute(fn)).rejects.toThrow('Circuit breaker [test-circuit] is OPEN');

            // Function should not be called
            expect(fn).not.toHaveBeenCalled();
        });

        it('should use fallback when provided', async () => {
            const fn = vi.fn().mockResolvedValue('success');
            const fallback = vi.fn().mockResolvedValue('fallback');

            const result = await circuit.execute(fn, fallback);

            expect(result).toBe('fallback');
            expect(fn).not.toHaveBeenCalled();
            expect(fallback).toHaveBeenCalledTimes(1);
        });

        it('should transition to HALF_OPEN after timeout', async () => {
            // Wait for timeout (1 second)
            await new Promise(resolve => setTimeout(resolve, 1100));

            const fn = vi.fn().mockResolvedValue('success');
            await circuit.execute(fn);

            expect(circuit.getState()).toBe(CircuitState.HALF_OPEN);
        });

        it('should track rejected requests', async () => {
            const fn = vi.fn().mockResolvedValue('success');

            try { await circuit.execute(fn); } catch (e) { }
            try { await circuit.execute(fn); } catch (e) { }

            const metrics = circuit.getMetrics();
            expect(metrics.rejectedRequests).toBe(2);
        });
    });

    describe('State: HALF_OPEN', () => {
        beforeEach(async () => {
            // Force circuit to OPEN then HALF_OPEN
            const fn = vi.fn().mockRejectedValue(new Error('Failed'));
            for (let i = 0; i < 3; i++) {
                try { await circuit.execute(fn); } catch (e) { }
            }

            // Wait for timeout
            await new Promise(resolve => setTimeout(resolve, 1100));

            // Trigger HALF_OPEN
            const successFn = vi.fn().mockResolvedValue('test');
            await circuit.execute(successFn);
        });

        it('should transition to CLOSED after success threshold', async () => {
            const fn = vi.fn().mockResolvedValue('success');

            // Need 2 successes (threshold) total, already have 1 from beforeEach
            await circuit.execute(fn);

            expect(circuit.getState()).toBe(CircuitState.CLOSED);
        });

        it('should transition back to OPEN on any failure', async () => {
            const fn = vi.fn().mockRejectedValue(new Error('Failed'));

            try {
                await circuit.execute(fn);
            } catch (e) {
                // Expected
            }

            expect(circuit.getState()).toBe(CircuitState.OPEN);
        });
    });

    describe('Manual control', () => {
        it('should manually reset to CLOSED', async () => {
            // Force OPEN
            const fn = vi.fn().mockRejectedValue(new Error('Failed'));
            for (let i = 0; i < 3; i++) {
                try { await circuit.execute(fn); } catch (e) { }
            }

            expect(circuit.getState()).toBe(CircuitState.OPEN);

            circuit.reset();

            expect(circuit.getState()).toBe(CircuitState.CLOSED);
            const metrics = circuit.getMetrics();
            expect(metrics.consecutiveFailures).toBe(0);
        });

        it('should manually open circuit', () => {
            circuit.open();
            expect(circuit.getState()).toBe(CircuitState.OPEN);
        });
    });

    describe('Metrics', () => {
        it('should track total requests', async () => {
            const fn = vi.fn().mockResolvedValue('success');

            await circuit.execute(fn);
            await circuit.execute(fn);

            const metrics = circuit.getMetrics();
            expect(metrics.totalRequests).toBe(2);
            expect(metrics.successes).toBe(2);
        });

        it('should track failures and successes', async () => {
            const successFn = vi.fn().mockResolvedValue('success');
            const failFn = vi.fn().mockRejectedValue(new Error('Failed'));

            await circuit.execute(successFn);
            try { await circuit.execute(failFn); } catch (e) { }
            await circuit.execute(successFn);

            const metrics = circuit.getMetrics();
            expect(metrics.successes).toBe(2);
            expect(metrics.failures).toBe(1);
        });

        it('should track state changes', async () => {
            const fn = vi.fn().mockRejectedValue(new Error('Failed'));

            for (let i = 0; i < 3; i++) {
                try { await circuit.execute(fn); } catch (e) { }
            }

            const metrics = circuit.getMetrics();
            expect(metrics.lastStateChange).toBeDefined();
        });

        it('should track events', async () => {
            const successFn = vi.fn().mockResolvedValue('success');

            await circuit.execute(successFn);

            const events = circuit.getEvents();
            expect(events.length).toBeGreaterThan(0);
            expect(events[events.length - 1].type).toBe('REQUEST_SUCCESS');
        });
    });
});
