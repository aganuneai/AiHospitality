/**
 * Allotment Service
 * 
 * Manages group bookings and room blocks:
 * - Create group blocks with release policies
 * - Track pickup (rooms booked vs allocated)
 * - Automatic release of unsold inventory
 * - Group rates and contracts
 */

import { prisma } from '../db';
import { logger } from '../logger';
import { getCurrentTenantId } from '../tenancy/tenant-context';

/**
 * Group block
 */
export interface GroupBlock {
    id: string;
    groupName: string;
    propertyId: string;
    roomTypeId: string;

    // Allocation
    roomCount: number;
    pickedUp: number;
    remaining: number;

    // Dates
    checkIn: Date;
    checkOut: Date;
    cutoffDate: Date;

    // Rates
    ratePerNight: number;
    currency: string;

    // Status
    released: boolean;
    releasedAt?: Date;

    createdAt: Date;
    updatedAt: Date;
}

/**
 * Pickup report
 */
export interface PickupReport {
    blockId: string;
    groupName: string;

    allocated: number;
    pickedUp: number;
    remaining: number;

    pickupRate: number;      // Percentage
    daysUntilCutoff: number;

    projectedPickup: number; // Based on trends
    recommendation: 'HOLD' | 'RELEASE_PARTIAL' | 'RELEASE_ALL';
}

/**
 * Allotment Service
 */
export class AllotmentService {

    /**
     * Create a group block
     * 
     * @param blockData - Group block data
     */
    async createBlock(
        groupName: string,
        roomCount: number,
        dateRange: { checkIn: Date; checkOut: Date },
        options: {
            propertyId: string;
            roomTypeId: string;
            ratePerNight: number;
            currency?: string;
            cutoffDate?: Date;
            contactName?: string;
            contactEmail?: string;
        }
    ): Promise<GroupBlock> {
        const tenantId = getCurrentTenantId();

        logger.info('Creating group block', {
            tenantId,
            groupName,
            roomCount,
            dateRange,
            options
        });

        // Validate dates
        if (dateRange.checkIn >= dateRange.checkOut) {
            throw new Error('Check-out must be after check-in');
        }

        // Default cutoff: 30 days before arrival
        const cutoffDate = options.cutoffDate || new Date(
            dateRange.checkIn.getTime() - (30 * 24 * 60 * 60 * 1000)
        );

        if (cutoffDate >= dateRange.checkIn) {
            throw new Error('Cutoff date must be before check-in');
        }

        // Check inventory availability
        const available = await this.checkInventory(
            options.propertyId,
            options.roomTypeId,
            dateRange.checkIn,
            dateRange.checkOut
        );

        if (available < roomCount) {
            throw new Error(`Only ${available} rooms available, requested ${roomCount}`);
        }

        // Create block
        const block = await prisma.groupBlock.create({
            data: {
                groupName,
                propertyId: options.propertyId,
                roomTypeId: options.roomTypeId,
                roomCount,
                pickedUp: 0,
                checkIn: dateRange.checkIn,
                checkOut: dateRange.checkOut,
                cutoffDate,
                ratePerNight: options.ratePerNight,
                currency: options.currency || 'USD',
                released: false,
                contactName: options.contactName,
                contactEmail: options.contactEmail
            }
        });

        // Reserve inventory
        await this.reserveInventory(
            options.propertyId,
            options.roomTypeId,
            dateRange.checkIn,
            dateRange.checkOut,
            roomCount
        );

        logger.info('Group block created successfully', {
            blockId: block.id,
            groupName,
            roomCount
        });

        return this.formatBlock(block);
    }

    /**
     * Format block for response
     */
    private formatBlock(block: any): GroupBlock {
        return {
            id: block.id,
            groupName: block.groupName,
            propertyId: block.propertyId,
            roomTypeId: block.roomTypeId,
            roomCount: block.roomCount,
            pickedUp: block.pickedUp,
            remaining: block.roomCount - block.pickedUp,
            checkIn: block.checkIn,
            checkOut: block.checkOut,
            cutoffDate: block.cutoffDate,
            ratePerNight: parseFloat(block.ratePerNight),
            currency: block.currency,
            released: block.released,
            releasedAt: block.releasedAt,
            createdAt: block.createdAt,
            updatedAt: block.updatedAt
        };
    }

    /**
     * Check inventory availability
     */
    private async checkInventory(
        propertyId: string,
        roomTypeId: string,
        checkIn: Date,
        checkOut: Date
    ): Promise<number> {
        // Get days between check-in and check-out
        const days = Math.ceil(
            (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Check availability for each day
        const inventoryChecks = [];
        for (let i = 0; i < days; i++) {
            const date = new Date(checkIn);
            date.setDate(date.getDate() + i);

            inventoryChecks.push(
                prisma.inventory.findFirst({
                    where: {
                        propertyId,
                        roomTypeId,
                        date
                    },
                    select: { available: true }
                })
            );
        }

        const results = await Promise.all(inventoryChecks);

        // Return minimum available across all days
        return Math.min(
            ...results.map(r => r?.available || 0)
        );
    }

    /**
     * Reserve inventory for group block
     */
    private async reserveInventory(
        propertyId: string,
        roomTypeId: string,
        checkIn: Date,
        checkOut: Date,
        roomCount: number
    ): Promise<void> {
        const days = Math.ceil(
            (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Update inventory for each day
        for (let i = 0; i < days; i++) {
            const date = new Date(checkIn);
            date.setDate(date.getDate() + i);

            await prisma.inventory.updateMany({
                where: {
                    propertyId,
                    roomTypeId,
                    date
                },
                data: {
                    available: {
                        decrement: roomCount
                    }
                }
            });
        }

        logger.info('Inventory reserved for group block', {
            propertyId,
            roomTypeId,
            roomCount,
            days
        });
    }

    /**
     * Track pickup for a group block
     * 
     * @param blockId - Block ID
     */
    async trackPickup(blockId: string): Promise<PickupReport> {
        const tenantId = getCurrentTenantId();

        logger.info('Tracking pickup', {
            tenantId,
            blockId
        });

        const block = await prisma.groupBlock.findUnique({
            where: { id: blockId }
        });

        if (!block) {
            throw new Error(`Group block ${blockId} not found`);
        }

        // Calculate pickup rate
        const pickupRate = block.roomCount > 0
            ? (block.pickedUp / block.roomCount) * 100
            : 0;

        // Days until cutoff
        const now = new Date();
        const daysUntilCutoff = Math.ceil(
            (block.cutoffDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Project final pickup (simple linear projection)
        const daysElapsed = Math.ceil(
            (now.getTime() - block.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        const totalDaysUntilCheckIn = Math.ceil(
            (block.checkIn.getTime() - block.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        const pickupRate_perDay = daysElapsed > 0
            ? block.pickedUp / daysElapsed
            : 0;

        const projectedPickup = Math.min(
            Math.floor(pickupRate_perDay * totalDaysUntilCheckIn),
            block.roomCount
        );

        // Recommendation
        let recommendation: PickupReport['recommendation'] = 'HOLD';

        if (daysUntilCutoff <= 0) {
            // Past cutoff
            recommendation = 'RELEASE_ALL';
        } else if (daysUntilCutoff <= 7 && pickupRate < 50) {
            // 7 days to cutoff, < 50% pickup
            recommendation = 'RELEASE_PARTIAL';
        } else if (projectedPickup < block.roomCount * 0.7) {
            // Projected pickup < 70% of allocated
            recommendation = 'RELEASE_PARTIAL';
        }

        const report: PickupReport = {
            blockId: block.id,
            groupName: block.groupName,
            allocated: block.roomCount,
            pickedUp: block.pickedUp,
            remaining: block.roomCount - block.pickedUp,
            pickupRate,
            daysUntilCutoff,
            projectedPickup,
            recommendation
        };

        logger.info('Pickup tracked', report);

        return report;
    }

    /**
     * Release unsold rooms back to general inventory
     * 
     * @param blockId - Block ID
     * @param cutoffDate - Cutoff date (optional, uses block's cutoff if not provided)
     */
    async releaseUnsold(
        blockId: string,
        cutoffDate?: Date
    ): Promise<void> {
        const tenantId = getCurrentTenantId();

        logger.info('Releasing unsold rooms', {
            tenantId,
            blockId,
            cutoffDate
        });

        const block = await prisma.groupBlock.findUnique({
            where: { id: blockId }
        });

        if (!block) {
            throw new Error(`Group block ${blockId} not found`);
        }

        // Check if already released
        if (block.released) {
            logger.info('Block already released', { blockId });
            return;
        }

        // Check if cutoff date reached
        const effectiveCutoffDate = cutoffDate || block.cutoffDate;
        const now = new Date();

        if (now < effectiveCutoffDate) {
            throw new Error(
                `Cannot release before cutoff date (${effectiveCutoffDate.toISOString()})`
            );
        }

        // Calculate unsold rooms
        const unsold = block.roomCount - block.pickedUp;

        if (unsold <= 0) {
            logger.info('No unsold rooms to release', { blockId });
            return;
        }

        // Release inventory back to general pool
        await this.releaseInventory(
            block.propertyId,
            block.roomTypeId,
            block.checkIn,
            block.checkOut,
            unsold
        );

        // Mark block as released
        await prisma.groupBlock.update({
            where: { id: blockId },
            data: {
                released: true,
                releasedAt: new Date()
            }
        });

        logger.info('Unsold rooms released successfully', {
            blockId,
            unsold
        });
    }

    /**
     * Release inventory back to general pool
     */
    private async releaseInventory(
        propertyId: string,
        roomTypeId: string,
        checkIn: Date,
        checkOut: Date,
        roomCount: number
    ): Promise<void> {
        const days = Math.ceil(
            (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Update inventory for each day
        for (let i = 0; i < days; i++) {
            const date = new Date(checkIn);
            date.setDate(date.getDate() + i);

            await prisma.inventory.updateMany({
                where: {
                    propertyId,
                    roomTypeId,
                    date
                },
                data: {
                    available: {
                        increment: roomCount
                    }
                }
            });
        }

        logger.info('Inventory released back to general pool', {
            propertyId,
            roomTypeId,
            roomCount,
            days
        });
    }

    /**
     * Increment pickup count when a reservation is created from block
     * 
     * @param blockId - Block ID
     */
    async incrementPickup(blockId: string): Promise<void> {
        await prisma.groupBlock.update({
            where: { id: blockId },
            data: {
                pickedUp: {
                    increment: 1
                }
            }
        });

        logger.info('Pickup incremented', { blockId });
    }

    /**
     * Get all active blocks
     */
    async getActiveBlocks(propertyId?: string): Promise<GroupBlock[]> {
        const blocks = await prisma.groupBlock.findMany({
            where: {
                released: false,
                propertyId,
                checkIn: {
                    gte: new Date() // Future arrivals only
                }
            },
            orderBy: {
                checkIn: 'asc'
            }
        });

        return blocks.map(b => this.formatBlock(b));
    }

    /**
     * Auto-release blocks past cutoff (cron job)
     */
    async autoReleasePastCutoff(): Promise<void> {
        const now = new Date();

        logger.info('Auto-releasing blocks past cutoff');

        const blocksToRelease = await prisma.groupBlock.findMany({
            where: {
                released: false,
                cutoffDate: {
                    lt: now
                }
            }
        });

        logger.info(`Found ${blocksToRelease.length} blocks to release`);

        for (const block of blocksToRelease) {
            try {
                await this.releaseUnsold(block.id);
            } catch (error: any) {
                logger.error('Failed to auto-release block', {
                    blockId: block.id,
                    error: error.message
                });
            }
        }
    }
}

/**
 * Singleton instance
 */
export const allotmentService = new AllotmentService();
