/**
 * Circuit Breaker Wrapper for Prisma
 * 
 * Protects database queries with circuit breaker pattern.
 */

import { CircuitBreaker } from './circuit-breaker';
import { prisma } from '../db';

// Create circuit breakers for different operations
export const dbCircuits = {
    read: new CircuitBreaker('database-read', {
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 30000
    }),

    write: new CircuitBreaker('database-write', {
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 60000  // Longer timeout for writes
    }),

    bulk: new CircuitBreaker('database-bulk', {
        failureThreshold: 2,
        successThreshold: 1,
        timeout: 90000  // Even longer for bulk operations
    })
};

/**
 * Execute Prisma query with circuit breaker protection
 * 
 * Usage:
 * ```ts
 * const roomTypes = await withCircuitBreaker(
 *   dbCircuits.read,
 *   () => prisma.roomType.findMany({ where: { propertyId: hotelId } }),
 *   () => [] // Fallback: return empty array
 * );
 * ```
 */
export async function withCircuitBreaker<T>(
    circuit: CircuitBreaker,
    query: () => Promise<T>,
    fallback?: () => Promise<T>
): Promise<T> {
    return circuit.execute(query, fallback);
}

/**
 * Get all circuit metrics
 */
export function getCircuitMetrics() {
    return {
        read: dbCircuits.read.getMetrics(),
        write: dbCircuits.write.getMetrics(),
        bulk: dbCircuits.bulk.getMetrics()
    };
}
