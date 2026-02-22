/**
 * Cached Queries
 * 
 * Wraps common Prisma queries with caching layer.
 */

import { prisma } from '../db';
import * as cache from './cache-service';
import { cacheKey, listCacheKey, inventoryCacheKey, rateCacheKey, getTTL, INVALIDATION_TAGS } from './cache-keys';
import { getCurrentTenantId } from '../tenancy/tenant-context';
import { logger } from '../logger';

/**
 * Cached: Get room type by ID
 * 
 * @param roomTypeId - Room type ID
 * @returns Room type or null
 */
export async function getRoomType(roomTypeId: string) {
    const tenantId = getCurrentTenantId();
    const key = cacheKey(tenantId, 'roomTypes', roomTypeId);

    // Try cache first
    const cached = await cache.get(key);
    if (cached) return cached;

    // Query database
    const roomType = await prisma.roomType.findUnique({
        where: { id: roomTypeId }
    });

    // Cache result
    if (roomType) {
        await cache.set(key, roomType, getTTL('roomTypes'));
    }

    return roomType;
}

/**
 * Cached: List all room types
 * 
 * @param propertyId - Property ID
 * @returns Room types
 */
export async function listRoomTypes(propertyId: string) {
    const tenantId = getCurrentTenantId();
    const key = listCacheKey(tenantId, 'roomTypes', { propertyId });

    // Try cache
    const cached = await cache.get(key);
    if (cached) return cached;

    // Query database
    const roomTypes = await prisma.roomType.findMany({
        where: { propertyId }
    });

    // Cache result
    await cache.set(key, roomTypes, getTTL('roomTypes'));

    return roomTypes;
}

/**
 * Cached: Get rate plan by ID
 * 
 * @param ratePlanId - Rate plan ID
 * @returns Rate plan or null
 */
export async function getRatePlan(ratePlanId: string) {
    const tenantId = getCurrentTenantId();
    const key = cacheKey(tenantId, 'ratePlans', ratePlanId);

    // Try cache
    const cached = await cache.get(key);
    if (cached) return cached;

    // Query database
    const ratePlan = await prisma.ratePlan.findUnique({
        where: { id: ratePlanId }
    });

    // Cache result
    if (ratePlan) {
        await cache.set(key, ratePlan, getTTL('ratePlans'));
    }

    return ratePlan;
}

/**
 * Cached: Get inventory for date
 * 
 * @param roomTypeId - Room type ID
 * @param date - Date
 * @returns Inventory or null
 */
export async function getInventory(roomTypeId: string, date: Date) {
    const tenantId = getCurrentTenantId();
    const dateStr = date.toISOString().split('T')[0];
    const key = inventoryCacheKey(tenantId, roomTypeId, dateStr);

    // Try cache
    const cached = await cache.get(key);
    if (cached) return cached;

    // Query database
    const inventory = await prisma.inventory.findFirst({
        where: {
            roomTypeId,
            date
        }
    });

    // Cache result
    if (inventory) {
        await cache.set(key, inventory, getTTL('inventory'));
    }

    return inventory;
}

/**
 * Cached: Get rate for date
 * 
 * @param ratePlanId - Rate plan ID
 * @param date - Date
 * @returns Rate or null
 */
export async function getRate(ratePlanId: string, date: Date) {
    const tenantId = getCurrentTenantId();
    const dateStr = date.toISOString().split('T')[0];
    const key = rateCacheKey(tenantId, ratePlanId, dateStr);

    // Try cache
    const cached = await cache.get(key);
    if (cached) return cached;

    // Query database
    const rate = await prisma.rate.findFirst({
        where: {
            ratePlanCode: ratePlanId,
            date
        }
    });

    // Cache result
    if (rate) {
        await cache.set(key, rate, getTTL('rates'));
    }

    return rate;
}

/**
 * Invalidate caches after mutation
 * 
 * Call this after INSERT/UPDATE/DELETE operations.
 * 
 * @param entity - Entity type that was mutated
 * @param identifiers - Entity identifiers (for targeted invalidation)
 */
export async function invalidateAfterMutation(
    entity: 'roomTypes' | 'ratePlans' | 'inventory' | 'rates' | 'restrictions',
    identifiers?: {
        roomTypeId?: string;
        ratePlanId?: string;
    }
): Promise<void> {
    const tenantId = getCurrentTenantId();

    logger.info('Invalidating cache', {
        entity,
        tenantId,
        identifiers
    });

    switch (entity) {
        case 'roomTypes':
            await cache.invalidatePattern(INVALIDATION_TAGS.roomTypes(tenantId));
            break;

        case 'ratePlans':
            await cache.invalidatePattern(INVALIDATION_TAGS.ratePlans(tenantId));
            break;

        case 'inventory':
            if (identifiers?.roomTypeId) {
                await cache.invalidatePattern(
                    INVALIDATION_TAGS.inventoryByDate(tenantId, identifiers.roomTypeId)
                );
            } else {
                await cache.invalidatePattern(INVALIDATION_TAGS.allInventory(tenantId));
            }
            break;

        case 'rates':
            if (identifiers?.ratePlanId) {
                await cache.invalidatePattern(
                    INVALIDATION_TAGS.ratesByPlan(tenantId, identifiers.ratePlanId)
                );
            } else {
                await cache.invalidatePattern(INVALIDATION_TAGS.allRates(tenantId));
            }
            break;

        case 'restrictions':
            await cache.invalidatePattern(INVALIDATION_TAGS.restrictions(tenantId));
            break;
    }

    // Always invalidate quotes (dependent on all above entities)
    await cache.invalidatePattern(INVALIDATION_TAGS.quotes(tenantId));
}

/**
 * Example: Cached ARI bulk update
 * 
 * Update inventory and invalidate cache.
 * 
 * @param roomTypeId - Room type ID
 * @param date - Date
 * @param available - New available count
 */
export async function updateInventory(
    roomTypeId: string,
    date: Date,
    available: number
): Promise<void> {
    throw new Error('updateInventory requires propertyId for unique constrained upsert. Not implemented.');
}

/**
 * Example: Cached rate update
 * 
 * Update rate and invalidate cache.
 * 
 * @param ratePlanId - Rate plan ID
 * @param date - Date
 * @param amount - New rate amount
 */
export async function updateRate(
    ratePlanId: string,
    date: Date,
    amount: number
): Promise<void> {
    throw new Error('updateRate requires propertyId and roomTypeId for unique constrained upsert. Not implemented.');


    // Invalidate cache
    await invalidateAfterMutation('rates', { ratePlanId });
}
