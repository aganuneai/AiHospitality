/**
 * Cache Keys
 * 
 * Standardized key patterns and TTL strategies.
 */

/**
 * Entity TTL configurations (seconds)
 */
export const CACHE_TTL = {
    roomTypes: 3600,        // 1 hour (mostly static)
    ratePlans: 1800,        // 30 min (semi-static)
    inventory: 300,         // 5 min (dynamic)
    rates: 600,             // 10 min (dynamic)
    restrictions: 600,      // 10 min (dynamic)
    quotes: 60,             // 1 min (ephemeral)
    user: 900,              // 15 min
    tenant: 1800            // 30 min
} as const;

/**
 * Generate cache key
 * 
 * Format: cache:tenant:{tenantId}:{entity}:{id}
 * 
 * @param tenantId - Tenant ID
 * @param entity - Entity type
 * @param id - Entity ID or identifier
 * @returns Cache key
 */
export function cacheKey(
    tenantId: string,
    entity: keyof typeof CACHE_TTL,
    id: string
): string {
    return `cache:tenant:${tenantId}:${entity}:${id}`;
}

/**
 * Generate list cache key
 * 
 * For queries that return lists.
 * 
 * @param tenantId - Tenant ID
 * @param entity - Entity type
 * @param filters - Query filters (serialized)
 * @returns Cache key
 */
export function listCacheKey(
    tenantId: string,
    entity: keyof typeof CACHE_TTL,
    filters: Record<string, any> = {}
): string {
    const filterHash = Object.entries(filters)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
        .join('&');

    const hash = require('crypto')
        .createHash('md5')
        .update(filterHash)
        .digest('hex')
        .substring(0, 8);

    return `cache:tenant:${tenantId}:${entity}:list:${hash}`;
}

/**
 * Generate inventory cache key
 * 
 * @param tenantId - Tenant ID
 * @param roomTypeId - Room type ID
 * @param date - Date (YYYY-MM-DD)
 * @returns Cache key
 */
export function inventoryCacheKey(
    tenantId: string,
    roomTypeId: string,
    date: string
): string {
    return `cache:tenant:${tenantId}:inventory:${roomTypeId}:${date}`;
}

/**
 * Generate rate cache key
 * 
 * @param tenantId - Tenant ID
 * @param ratePlanId - Rate plan ID
 * @param date - Date (YYYY-MM-DD)
 * @returns Cache key
 */
export function rateCacheKey(
    tenantId: string,
    ratePlanId: string,
    date: string
): string {
    return `cache:tenant:${tenantId}:rates:${ratePlanId}:${date}`;
}

/**
 * Generate quote cache key
 * 
 * @param tenantId - Tenant ID
 * @param quoteId - Quote ID
 * @returns Cache key
 */
export function quoteCacheKey(
    tenantId: string,
    quoteId: string
): string {
    return `cache:tenant:${tenantId}:quotes:${quoteId}`;
}

/**
 * Tag-based invalidation patterns
 */
export const INVALIDATION_TAGS = {
    // Invalidate room types
    roomTypes: (tenantId: string) =>
        `cache:tenant:${tenantId}:roomTypes:*`,

    // Invalidate rate plans
    ratePlans: (tenantId: string) =>
        `cache:tenant:${tenantId}:ratePlans:*`,

    // Invalidate inventory for date range
    inventoryByDate: (tenantId: string, roomTypeId: string) =>
        `cache:tenant:${tenantId}:inventory:${roomTypeId}:*`,

    // Invalidate all inventory
    allInventory: (tenantId: string) =>
        `cache:tenant:${tenantId}:inventory:*`,

    // Invalidate rates for rate plan
    ratesByPlan: (tenantId: string, ratePlanId: string) =>
        `cache:tenant:${tenantId}:rates:${ratePlanId}:*`,

    // Invalidate all rates
    allRates: (tenantId: string) =>
        `cache:tenant:${tenantId}:rates:*`,

    // Invalidate restrictions
    restrictions: (tenantId: string) =>
        `cache:tenant:${tenantId}:restrictions:*`,

    // Invalidate quotes
    quotes: (tenantId: string) =>
        `cache:tenant:${tenantId}:quotes:*`,

    // Invalidate all for tenant
    allForTenant: (tenantId: string) =>
        `cache:tenant:${tenantId}:*`
};

/**
 * Get TTL for entity type
 * 
 * @param entity - Entity type
 * @returns TTL in seconds
 */
export function getTTL(entity: keyof typeof CACHE_TTL): number {
    return CACHE_TTL[entity];
}
