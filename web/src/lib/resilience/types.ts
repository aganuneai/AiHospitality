/**
 * Circuit Breaker Types
 * 
 * Implements circuit breaker pattern for resilience.
 */

/**
 * Circuit breaker states
 */
export enum CircuitState {
    CLOSED = 'CLOSED',       // Normal operation
    OPEN = 'OPEN',           // Failing, reject all requests
    HALF_OPEN = 'HALF_OPEN'  // Testing if service recovered
}

/**
 * Circuit breaker configuration
 */
export interface CircuitConfig {
    failureThreshold: number;      // Failures to trigger OPEN (default: 5)
    successThreshold: number;      // Successes to CLOSED from HALF_OPEN (default: 2)
    timeout: number;               // Timeout in ms before HALF_OPEN (default: 30000)
    monitoringWindow: number;      // Window to track failures in ms (default: 60000)
}

/**
 * Circuit breaker metrics
 */
export interface CircuitMetrics {
    state: CircuitState;
    failures: number;
    successes: number;
    consecutiveFailures: number;
    consecutiveSuccesses: number;
    lastFailure?: Date;
    lastSuccess?: Date;
    lastStateChange: Date;
    totalRequests: number;
    rejectedRequests: number;
}

/**
 * Circuit breaker event
 */
export interface CircuitEvent {
    type: 'STATE_CHANGE' | 'REQUEST_SUCCESS' | 'REQUEST_FAILURE' | 'REQUEST_REJECTED';
    timestamp: Date;
    oldState?: CircuitState;
    newState?: CircuitState;
    error?: Error;
}

/**
 * Default circuit breaker configuration
 */
export const DEFAULT_CIRCUIT_CONFIG: CircuitConfig = {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000,           // 30 seconds
    monitoringWindow: 60000   // 1 minute
};
