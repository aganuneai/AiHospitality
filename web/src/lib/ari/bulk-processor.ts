/**
 * Bulk ARI Processor
 * 
 * Handles batch processing of ARI (Availability, Rates, Inventory) updates.
 * Supports transactions with rollback on failure.
 */

import { prisma } from '../db';
import { logger } from '../logger';

/**
 * Bulk ARI operation
 */
export interface BulkARIOperation {
    date: string;              // ISO date (YYYY-MM-DD)
    roomTypeCode: string;
    available?: number;        // Inventory count
    price?: number;            // Rate amount
    minLOS?: number;          // Minimum length of stay
    maxLOS?: number;          // Maximum length of stay
    closedToArrival?: boolean;
    closedToDeparture?: boolean;
    stopSell?: boolean;
    closed?: boolean;
}

/**
 * Bulk operation request
 */
export interface BulkARIRequest {
    operations: BulkARIOperation[];
}

/**
 * Bulk operation result
 */
export interface BulkARIResult {
    success: boolean;
    processed: number;
    failed: number;
    errors?: Array<{
        index: number;
        operation: BulkARIOperation;
        error: string;
    }>;
    duration: number;
}

/**
 * Process bulk ARI operations
 * 
 * @param hotelId - Property ID
 * @param request - Bulk operations request
 * @returns Processing result
 */
export async function processBulkARI(
    hotelId: string,
    request: BulkARIRequest
): Promise<BulkARIResult> {
    const startTime = Date.now();

    if (request.operations.length === 0) {
        return {
            success: true,
            processed: 0,
            failed: 0,
            duration: Date.now() - startTime
        };
    }

    if (request.operations.length > 500) {
        throw new Error('Maximum 500 operations per batch');
    }

    logger.info('Processing bulk ARI operations', {
        hotelId,
        count: request.operations.length
    });

    try {
        // Execute in transaction
        const result = await prisma.$transaction(async (tx) => {
            let processed = 0;
            let failed = 0;
            const errors: Array<{ index: number; operation: BulkARIOperation; error: string }> = [];

            for (let i = 0; i < request.operations.length; i++) {
                const op = request.operations[i];

                try {
                    // Parse date
                    const date = new Date(op.date);
                    if (isNaN(date.getTime())) {
                        throw new Error('Invalid date format');
                    }

                    // Get room type
                    const roomType = await tx.roomType.findUnique({
                        where: {
                            propertyId_code: {
                                propertyId: hotelId,
                                code: op.roomTypeCode
                            }
                        }
                    });

                    if (!roomType) {
                        throw new Error(`Room type ${op.roomTypeCode} not found`);
                    }

                    // Update or create inventory
                    if (op.available !== undefined) {
                        const count = await tx.room.count({
                            where: { roomTypeId: roomType.id, status: { not: 'OOO' } }
                        });
                        const safeAvail = Math.min(op.available, count);

                        await tx.inventory.upsert({
                            where: {
                                propertyId_roomTypeId_date: {
                                    propertyId: hotelId,
                                    roomTypeId: roomType.id,
                                    date
                                }
                            },
                            update: {
                                available: safeAvail,
                                total: count
                            },
                            create: {
                                propertyId: hotelId,
                                roomTypeId: roomType.id,
                                date,
                                total: count,
                                available: safeAvail,
                                booked: 0
                            }
                        });
                    }

                    // Update or create rate
                    if (op.price !== undefined) {
                        await tx.rate.upsert({
                            where: {
                                propertyId_roomTypeId_date_ratePlanCode: {
                                    propertyId: hotelId,
                                    roomTypeId: roomType.id,
                                    date,
                                    ratePlanCode: 'BAR' // Default to BAR rate plan
                                }
                            },
                            update: {
                                amount: op.price
                            },
                            create: {
                                propertyId: hotelId,
                                roomTypeId: roomType.id,
                                ratePlanCode: 'BAR',
                                date,
                                amount: op.price,
                                currency: 'USD'
                            }
                        });
                    }

                    // Update or create restriction
                    if (
                        op.minLOS !== undefined ||
                        op.maxLOS !== undefined ||
                        op.closedToArrival !== undefined ||
                        op.closedToDeparture !== undefined ||
                        op.stopSell !== undefined ||
                        op.closed !== undefined
                    ) {
                        await tx.restriction.upsert({
                            where: {
                                propertyId_roomTypeId_date_ratePlanCode: {
                                    propertyId: hotelId,
                                    roomTypeId: roomType.id,
                                    date,
                                    ratePlanCode: 'BASE'
                                }
                            },
                            update: {
                                ...(op.minLOS !== undefined && { minLOS: op.minLOS }),
                                ...(op.maxLOS !== undefined && { maxLOS: op.maxLOS }),
                                ...(op.closedToArrival !== undefined && { closedToArrival: op.closedToArrival }),
                                ...(op.closedToDeparture !== undefined && { closedToDeparture: op.closedToDeparture }),
                                ...(op.stopSell !== undefined && { stopSell: op.stopSell }),
                                ...(op.closed !== undefined && { closed: op.closed })
                            },
                            create: {
                                propertyId: hotelId,
                                roomTypeId: roomType.id,
                                date,
                                ratePlanCode: 'BASE',
                                minLOS: op.minLOS || null,
                                maxLOS: op.maxLOS || null,
                                closedToArrival: op.closedToArrival || false,
                                closedToDeparture: op.closedToDeparture || false,
                                stopSell: op.stopSell || false,
                                closed: op.closed || false
                            }
                        });
                    }

                    processed++;
                } catch (error: any) {
                    failed++;
                    errors.push({
                        index: i,
                        operation: op,
                        error: error.message
                    });

                    logger.warn('Bulk operation failed', {
                        index: i,
                        operation: op,
                        error: error.message
                    });

                    // If more than 10% failed, abort transaction
                    if (failed / request.operations.length > 0.1) {
                        throw new Error(`Too many failures (${failed}/${request.operations.length}). Rolling back.`);
                    }
                }
            }

            return { processed, failed, errors };
        });

        const duration = Date.now() - startTime;

        logger.info('Bulk ARI processing completed', {
            hotelId,
            processed: result.processed,
            failed: result.failed,
            duration
        });

        return {
            success: result.failed === 0,
            processed: result.processed,
            failed: result.failed,
            errors: result.failed > 0 ? result.errors : undefined,
            duration
        };

    } catch (error: any) {
        const duration = Date.now() - startTime;

        logger.error('Bulk ARI processing error', {
            hotelId,
            error: error.message,
            duration
        });

        throw error;
    }
}
