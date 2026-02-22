/**
 * Channel Mode Validator
 * 
 * Enforces distribution mode exclusivity:
 * A channel can operate in SHOP_BOOK or ARI_PUSH mode, but NOT both.
 * 
 * This prevents data inconsistency where a channel might pull AND receive pushes.
 */

import crypto from 'crypto';
import { prisma } from '../db';
import { logger } from '../logger';
import { getCurrentTenantId } from '../tenancy/tenant-context';

/**
 * Distribution mode
 */
export enum DistributionMode {
    SHOP_BOOK = 'SHOP_BOOK',   // Channel pulls availability/rates and creates bookings
    ARI_PUSH = 'ARI_PUSH'        // We push availability/rates/inventory to channel
}

/**
 * Validation result
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Mode change request
 */
export interface ModeChangeRequest {
    channelId: string;
    requestedMode: DistributionMode;
    reason: string;
    requestedBy: string;
}

/**
 * Channel Mode Validator
 */
export class ChannelModeValidator {

    /**
     * Validate distribution mode
     * 
     * @param channelId - Channel ID
     * @param requestedMode - Requested distribution mode
     * @returns Validation result
     */
    async validateMode(
        channelId: string,
        requestedMode: DistributionMode
    ): Promise<ValidationResult> {
        const tenantId = getCurrentTenantId();
        const errors: string[] = [];
        const warnings: string[] = [];

        logger.info('Validating distribution mode', {
            tenantId,
            channelId,
            requestedMode
        });

        // Get channel
        const channel = await prisma.channel.findUnique({
            where: { id: channelId },
            include: {
                _count: {
                    select: {
                        reservations: true,
                        ariUpdates: true
                    }
                }
            }
        });

        if (!channel) {
            errors.push(`Channel ${channelId} not found`);
            return { valid: false, errors, warnings };
        }

        // Check current mode
        if (channel.distributionMode && channel.distributionMode !== requestedMode) {
            // Mode change requested
            if (channel.modeLockedAt) {
                const daysSinceLock = (Date.now() - channel.modeLockedAt.getTime()) / (1000 * 60 * 60 * 24);

                if (daysSinceLock < 30) {
                    errors.push(
                        `Channel mode was locked ${daysSinceLock.toFixed(0)} days ago. ` +
                        `Mode changes require 30-day cooling period.`
                    );
                }
            }

            // Check activity
            const hasReservations = channel._count.reservations > 0;
            const hasARIUpdates = channel._count.ariUpdates > 0;

            if (requestedMode === DistributionMode.SHOP_BOOK && hasARIUpdates) {
                warnings.push(
                    `Channel has ${channel._count.ariUpdates} ARI updates. ` +
                    `Switching to SHOP_BOOK will stop receiving push updates.`
                );
            }

            if (requestedMode === DistributionMode.ARI_PUSH && hasReservations) {
                warnings.push(
                    `Channel has ${channel._count.reservations} reservations created via Shop/Book. ` +
                    `Switching to ARI_PUSH means channel will no longer create bookings directly.`
                );
            }
        }

        // Validate mode is supported by channel
        if (!this.isModeSupported(channel.type, requestedMode)) {
            errors.push(
                `Distribution mode ${requestedMode} is not supported for channel type ${channel.type}`
            );
        }

        const valid = errors.length === 0;

        logger.info('Mode validation completed', {
            channelId,
            requestedMode,
            valid,
            errors,
            warnings
        });

        return {
            valid,
            errors,
            warnings
        };
    }

    /**
     * Check if mode is supported by channel type
     */
    private isModeSupported(channelType: string, mode: DistributionMode): boolean {
        // Some channels only support specific modes
        const modeRestrictions: Record<string, DistributionMode[]> = {
            'BOOKING_COM': [DistributionMode.ARI_PUSH],
            'EXPEDIA': [DistributionMode.ARI_PUSH],
            'AIRBNB': [DistributionMode.ARI_PUSH],
            'GDS': [DistributionMode.SHOP_BOOK],
            'IBE': [DistributionMode.SHOP_BOOK],
            'METASEARCH': [DistributionMode.ARI_PUSH]
        };

        const allowedModes = modeRestrictions[channelType];
        if (!allowedModes) {
            // No restrictions, all modes supported
            return true;
        }

        return allowedModes.includes(mode);
    }

    /**
     * Enforce mode exclusivity
     * 
     * Validates that channel is not operating in both modes simultaneously.
     * 
     * @param channelId - Channel ID
     * @returns Validation result
     */
    async enforceExclusivity(channelId: string): Promise<void> {
        const tenantId = getCurrentTenantId();

        logger.info('Enforcing mode exclusivity', {
            tenantId,
            channelId
        });

        const channel = await prisma.channel.findUnique({
            where: { id: channelId }
        });

        if (!channel?.distributionMode) {
            logger.warn('Channel has no distribution mode set', { channelId });
            return;
        }

        // Check recent activity
        const recentReservations = await prisma.reservation.count({
            where: {
                channelId,
                createdAt: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
                }
            }
        });

        const recentARIUpdates = await prisma.aRIUpdate.count({
            where: {
                channelId,
                createdAt: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                }
            }
        });

        // Detect violations
        if (channel.distributionMode === DistributionMode.ARI_PUSH && recentReservations > 0) {
            logger.error('Mode exclusivity violation detected', {
                channelId,
                mode: DistributionMode.ARI_PUSH,
                violation: `Channel created ${recentReservations} reservations (should only receive ARI pushes)`
            });

            // Alert operations team
            throw new Error(
                `Channel ${channelId} is configured for ARI_PUSH but has created bookings directly. ` +
                `This violates mode exclusivity.`
            );
        }

        if (channel.distributionMode === DistributionMode.SHOP_BOOK && recentARIUpdates > 0) {
            logger.error('Mode exclusivity violation detected', {
                channelId,
                mode: DistributionMode.SHOP_BOOK,
                violation: `Channel received ${recentARIUpdates} ARI updates (should only pull data)`
            });

            throw new Error(
                `Channel ${channelId} is configured for SHOP_BOOK but has received ARI updates. ` +
                `This violates mode exclusivity.`
            );
        }

        logger.info('Mode exclusivity check passed', {
            channelId,
            mode: channel.distributionMode
        });
    }

    /**
     * Set channel mode
     * 
     * @param channelId - Channel ID
     * @param mode - Distribution mode
     * @param force - Force mode change (skip cooling period)
     * @returns Updated channel
     */
    async setMode(
        channelId: string,
        mode: DistributionMode,
        force: boolean = false
    ): Promise<void> {
        const tenantId = getCurrentTenantId();

        // Validate first
        const validation = await this.validateMode(channelId, mode);

        if (!validation.valid && !force) {
            throw new Error(
                `Cannot set mode for channel ${channelId}: ${validation.errors.join(', ')}`
            );
        }

        logger.info('Setting channel distribution mode', {
            tenantId,
            channelId,
            mode,
            force,
            warnings: validation.warnings
        });

        await prisma.channel.update({
            where: { id: channelId },
            data: {
                distributionMode: mode,
                modeLockedAt: new Date(),
                modeChangedBy: tenantId // User ID in real implementation
            }
        });

        // Audit trail
        await prisma.auditLog.create({
            data: {
                eventId: crypto.randomUUID(),
                eventType: 'CHANNEL_MODE_CHANGE',
                aggregateId: channelId,
                aggregateType: 'Channel',
                payload: {
                    mode,
                    force,
                    warnings: validation.warnings
                },
                hotelId: tenantId,
                entityType: 'Channel',
                entityId: channelId,
                action: 'MODE_CHANGE',
                changes: {
                    mode,
                    force,
                    warnings: validation.warnings
                },
                userId: tenantId,
                timestamp: new Date()
            }
        });

        logger.info('Channel mode set successfully', {
            channelId,
            mode
        });
    }

    /**
     * Get mode change history
     * 
     * @param channelId - Channel ID
     * @returns Mode change history
     */
    async getModeHistory(channelId: string): Promise<any[]> {
        const history = await prisma.auditLog.findMany({
            where: {
                entityType: 'Channel',
                entityId: channelId,
                action: 'MODE_CHANGE'
            },
            orderBy: {
                timestamp: 'desc'
            }
        });

        return history.map(entry => ({
            timestamp: entry.timestamp,
            mode: (entry.changes as any)?.mode,
            changedBy: entry.userId,
            forced: (entry.changes as any)?.force || false
        }));
    }

    /**
     * Validate all channels (audit)
     * 
     * Returns channels with mode violations.
     */
    async auditAllChannels(): Promise<Array<{
        channelId: string;
        mode: DistributionMode;
        violations: string[];
    }>> {
        const channels = await prisma.channel.findMany({
            where: {
                distributionMode: { not: null }
            }
        });

        const violations: Array<{
            channelId: string;
            mode: DistributionMode;
            violations: string[];
        }> = [];

        for (const channel of channels) {
            try {
                await this.enforceExclusivity(channel.id);
            } catch (error: any) {
                violations.push({
                    channelId: channel.id,
                    mode: channel.distributionMode as DistributionMode,
                    violations: [error.message]
                });
            }
        }

        logger.info('Channel mode audit completed', {
            totalChannels: channels.length,
            violationsFound: violations.length
        });

        return violations;
    }
}

/**
 * Singleton instance
 */
export const channelModeValidator = new ChannelModeValidator();
