/**
 * Circuit Breaker
 * 
 * Implements 3-state circuit breaker pattern:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Failing, reject all requests immediately (fail-fast)
 * - HALF_OPEN: Testing recovery, allow limited requests
 * 
 * State transitions:
 * CLOSED → OPEN (after N failures)
 * OPEN → HALF_OPEN (after timeout)
 * HALF_OPEN → CLOSED (after N successes)
 * HALF_OPEN → OPEN (on any failure)
 */

import {
    CircuitState,
    CircuitConfig,
    CircuitMetrics,
    CircuitEvent,
    DEFAULT_CIRCUIT_CONFIG
} from './types';
import { logger } from '../logger';

export class CircuitBreaker {
    private state: CircuitState = CircuitState.CLOSED;
    private config: CircuitConfig;
    private failures: number = 0;
    private successes: number = 0;
    private consecutiveFailures: number = 0;
    private consecutiveSuccesses: number = 0;
    private lastFailure?: Date;
    private lastSuccess?: Date;
    private lastStateChange: Date = new Date();
    private totalRequests: number = 0;
    private rejectedRequests: number = 0;
    private nextAttempt?: Date;
    private name: string;
    private events: CircuitEvent[] = [];

    constructor(name: string, config?: Partial<CircuitConfig>) {
        this.name = name;
        this.config = { ...DEFAULT_CIRCUIT_CONFIG, ...config };
    }

    /**
     * Execute function with circuit breaker protection
     * 
     * @param fn - Function to execute
     * @param fallback - Optional fallback function if circuit is open
     * @returns Function result or fallback
     */
    async execute<T>(
        fn: () => Promise<T>,
        fallback?: () => Promise<T>
    ): Promise<T> {
        this.totalRequests++;

        // Check if circuit is OPEN
        if (this.state === CircuitState.OPEN) {
            if (this.canAttemptReset()) {
                // Transition to HALF_OPEN
                this.transitionTo(CircuitState.HALF_OPEN);
            } else {
                // Circuit still OPEN, reject request
                this.rejectedRequests++;
                this.recordEvent({
                    type: 'REQUEST_REJECTED',
                    timestamp: new Date()
                });

                logger.warn('Circuit breaker rejecting request', {
                    circuit: this.name,
                    state: this.state,
                    nextAttempt: this.nextAttempt
                });

                if (fallback) {
                    return fallback();
                }

                throw new Error(`Circuit breaker [${this.name}] is OPEN. Service unavailable.`);
            }
        }

        // Execute function
        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error: any) {
            this.onFailure(error);

            if (fallback) {
                return fallback();
            }

            throw error;
        }
    }

    /**
     * Record successful request
     */
    private onSuccess(): void {
        this.successes++;
        this.consecutiveSuccesses++;
        this.consecutiveFailures = 0;
        this.lastSuccess = new Date();

        this.recordEvent({
            type: 'REQUEST_SUCCESS',
            timestamp: new Date()
        });

        if (this.state === CircuitState.HALF_OPEN) {
            // Check if we can close the circuit
            if (this.consecutiveSuccesses >= this.config.successThreshold) {
                this.transitionTo(CircuitState.CLOSED);
            }
        }
    }

    /**
     * Record failed request
     */
    private onFailure(error: Error): void {
        this.failures++;
        this.consecutiveFailures++;
        this.consecutiveSuccesses = 0;
        this.lastFailure = new Date();

        this.recordEvent({
            type: 'REQUEST_FAILURE',
            timestamp: new Date(),
            error
        });

        if (this.state === CircuitState.HALF_OPEN) {
            // Any failure in HALF_OPEN immediately reopens circuit
            this.transitionTo(CircuitState.OPEN);
        } else if (this.state === CircuitState.CLOSED) {
            // Check if we should open the circuit
            if (this.consecutiveFailures >= this.config.failureThreshold) {
                this.transitionTo(CircuitState.OPEN);
            }
        }
    }

    /**
     * Transition to new state
     */
    private transitionTo(newState: CircuitState): void {
        const oldState = this.state;

        if (oldState === newState) return;

        this.state = newState;
        this.lastStateChange = new Date();

        // Reset counters on state change
        if (newState === CircuitState.OPEN) {
            this.nextAttempt = new Date(Date.now() + this.config.timeout);
        } else if (newState === CircuitState.CLOSED) {
            this.consecutiveFailures = 0;
            this.consecutiveSuccesses = 0;
            this.nextAttempt = undefined;
        } else if (newState === CircuitState.HALF_OPEN) {
            this.consecutiveSuccesses = 0;
        }

        this.recordEvent({
            type: 'STATE_CHANGE',
            timestamp: new Date(),
            oldState,
            newState
        });

        logger.info('Circuit breaker state changed', {
            circuit: this.name,
            oldState,
            newState,
            failures: this.consecutiveFailures,
            successes: this.consecutiveSuccesses
        });
    }

    /**
     * Check if circuit can attempt reset (OPEN → HALF_OPEN)
     */
    private canAttemptReset(): boolean {
        if (!this.nextAttempt) return false;
        return Date.now() >= this.nextAttempt.getTime();
    }

    /**
     * Record event
     */
    private recordEvent(event: CircuitEvent): void {
        this.events.push(event);

        // Keep only last 100 events
        if (this.events.length > 100) {
            this.events.shift();
        }
    }

    /**
     * Get current metrics
     */
    getMetrics(): CircuitMetrics {
        return {
            state: this.state,
            failures: this.failures,
            successes: this.successes,
            consecutiveFailures: this.consecutiveFailures,
            consecutiveSuccesses: this.consecutiveSuccesses,
            lastFailure: this.lastFailure,
            lastSuccess: this.lastSuccess,
            lastStateChange: this.lastStateChange,
            totalRequests: this.totalRequests,
            rejectedRequests: this.rejectedRequests
        };
    }

    /**
     * Get recent events
     */
    getEvents(): CircuitEvent[] {
        return [...this.events];
    }

    /**
     * Manually reset circuit to CLOSED
     */
    reset(): void {
        this.transitionTo(CircuitState.CLOSED);
        this.failures = 0;
        this.successes = 0;
        this.consecutiveFailures = 0;
        this.consecutiveSuccesses = 0;
    }

    /**
     * Manually open circuit
     */
    open(): void {
        this.transitionTo(CircuitState.OPEN);
    }

    /**
     * Get current state
     */
    getState(): CircuitState {
        return this.state;
    }
}
