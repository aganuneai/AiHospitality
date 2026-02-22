/**
 * Metrics Collection Module
 * 
 * Provides lightweight in-memory metrics collection.
 * For production, consider integration with Prometheus/Datadog.
 */

/**
 * Metrics data structure
 */
interface Metrics {
    requestCount: Map<string, number>;
    errorCount: Map<string, number>;
    latency: Map<string, number[]>;
    idempotencyHits: Map<string, number>;
    cacheHits: Map<string, number>;
    cacheMisses: Map<string, number>;
}

/**
 * Metrics summary per endpoint
 */
export interface EndpointMetrics {
    count: number;
    p50: number;
    p95: number;
    p99: number;
    errors: number;
    errorRate: number;
    avgLatency: number;
}

/**
 * Overall metrics summary
 */
export interface MetricsSummary {
    [endpoint: string]: EndpointMetrics | any;
    _global?: {
        totalRequests: number;
        totalErrors: number;
        cacheHitRate: number;
        idempotencyHitRate: number;
    };
}

/**
 * Metrics Collector (Singleton)
 */
export class MetricsCollector {
    private metrics: Metrics = {
        requestCount: new Map(),
        errorCount: new Map(),
        latency: new Map(),
        idempotencyHits: new Map(),
        cacheHits: new Map(),
        cacheMisses: new Map()
    };

    /**
     * Record a request
     * 
     * @param endpoint - API endpoint (e.g., "/api/v1/quotes")
     */
    recordRequest(endpoint: string): void {
        const count = this.metrics.requestCount.get(endpoint) || 0;
        this.metrics.requestCount.set(endpoint, count + 1);
    }

    /**
     * Record an error
     * 
     * @param endpoint - API endpoint
     * @param errorCode - Error code (e.g., "VALIDATION_ERROR")
     */
    recordError(endpoint: string, errorCode: string): void {
        const key = `${endpoint}:${errorCode}`;
        const count = this.metrics.errorCount.get(key) || 0;
        this.metrics.errorCount.set(key, count + 1);

        // Also increment endpoint-level error counter
        const endpointKey = `${endpoint}:*`;
        const endpointErrors = this.metrics.errorCount.get(endpointKey) || 0;
        this.metrics.errorCount.set(endpointKey, endpointErrors + 1);
    }

    /**
     * Record request latency
     * 
     * @param endpoint - API endpoint
     * @param durationMs - Duration in milliseconds
     */
    recordLatency(endpoint: string, durationMs: number): void {
        const latencies = this.metrics.latency.get(endpoint) || [];
        latencies.push(durationMs);

        // Keep only last 1000 latencies to avoid memory bloat
        if (latencies.length > 1000) {
            latencies.shift();
        }

        this.metrics.latency.set(endpoint, latencies);
    }

    /**
     * Record idempotency cache hit
     * 
     * @param operation - Operation name
     */
    recordIdempotencyHit(operation: string): void {
        const count = this.metrics.idempotencyHits.get(operation) || 0;
        this.metrics.idempotencyHits.set(operation, count + 1);
    }

    /**
     * Record cache hit
     * 
     * @param cacheKey - Cache key or operation name
     */
    recordCacheHit(cacheKey: string): void {
        const count = this.metrics.cacheHits.get(cacheKey) || 0;
        this.metrics.cacheHits.set(cacheKey, count + 1);
    }

    /**
     * Record cache miss
     * 
     * @param cacheKey - Cache key or operation name
     */
    recordCacheMiss(cacheKey: string): void {
        const count = this.metrics.cacheMisses.get(cacheKey) || 0;
        this.metrics.cacheMisses.set(cacheKey, count + 1);
    }

    /**
     * Get metrics summary
     * 
     * @returns Metrics summary with percentiles
     */
    getMetrics(): MetricsSummary {
        const summary: MetricsSummary = {};

        // Calculate per-endpoint metrics
        for (const [endpoint, latencies] of this.metrics.latency) {
            const count = this.metrics.requestCount.get(endpoint) || 0;
            const errors = this.metrics.errorCount.get(`${endpoint}:*`) || 0;

            summary[endpoint] = {
                count,
                p50: this.percentile(latencies, 0.50),
                p95: this.percentile(latencies, 0.95),
                p99: this.percentile(latencies, 0.99),
                errors,
                errorRate: count > 0 ? (errors / count) * 100 : 0,
                avgLatency: latencies.length > 0
                    ? latencies.reduce((a, b) => a + b, 0) / latencies.length
                    : 0
            };
        }

        // Global metrics
        const totalRequests = Array.from(this.metrics.requestCount.values())
            .reduce((a, b) => a + b, 0);

        const totalErrors = Array.from(this.metrics.errorCount.entries())
            .filter(([key, _]) => key.endsWith(':*'))
            .map(([_, count]) => count)
            .reduce((a, b) => a + b, 0);

        const totalCacheHits = Array.from(this.metrics.cacheHits.values())
            .reduce((a, b) => a + b, 0);

        const totalCacheMisses = Array.from(this.metrics.cacheMisses.values())
            .reduce((a, b) => a + b, 0);

        const totalIdempotencyHits = Array.from(this.metrics.idempotencyHits.values())
            .reduce((a, b) => a + b, 0);

        summary._global = {
            totalRequests,
            totalErrors,
            cacheHitRate: (totalCacheHits + totalCacheMisses) > 0
                ? (totalCacheHits / (totalCacheHits + totalCacheMisses)) * 100
                : 0,
            idempotencyHitRate: totalRequests > 0
                ? (totalIdempotencyHits / totalRequests) * 100
                : 0
        };

        return summary;
    }

    /**
     * Calculate percentile from array of numbers
     * 
     * @param arr - Array of numbers
     * @param percentile - Percentile (0.0 to 1.0)
     * @returns Percentile value
     */
    private percentile(arr: number[], percentile: number): number {
        if (arr.length === 0) return 0;

        const sorted = [...arr].sort((a, b) => a - b);
        const index = Math.ceil(sorted.length * percentile) - 1;
        return sorted[Math.max(0, index)];
    }

    /**
     * Reset all metrics
     * 
     * Useful for testing or scheduled resets.
     */
    reset(): void {
        this.metrics = {
            requestCount: new Map(),
            errorCount: new Map(),
            latency: new Map(),
            idempotencyHits: new Map(),
            cacheHits: new Map(),
            cacheMisses: new Map()
        };
    }
}

// Export singleton instance
export const metricsCollector = new MetricsCollector();
