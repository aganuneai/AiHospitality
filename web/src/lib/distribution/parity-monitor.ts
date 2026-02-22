/**
 * ARI Parity Monitor
 * 
 * Cross-channel monitoring for rate and inventory divergence.
 * Detects and alerts on disparities between distribution channels.
 */

import { prisma } from '../db';
import { logger } from '../logger';
import { getCurrentTenantId } from '../tenancy/tenant-context';

/**
 * Parity check result
 */
export interface ParityCheck {
    id: string;
    channelA: string;
    channelB: string;
    propertyId: string;
    roomTypeId: string;
    ratePlanId: string;
    date: string;

    rateA: number;
    rateB: number;
    rateDiff: number;
    rateDiffPct: number;

    inventoryA: number;
    inventoryB: number;
    inventoryDiff: number;

    status: ParityStatus;
    checkedAt: Date;
}

/**
 * Parity status
 */
export enum ParityStatus {
    OK = 'OK',                  // Within threshold
    WARNING = 'WARNING',        // Exceeds warning threshold
    CRITICAL = 'CRITICAL'       // Exceeds critical threshold
}

/**
 * Parity dashboard metrics
 */
export interface ParityDashboard {
    totalChecks: number;
    okCount: number;
    warningCount: number;
    criticalCount: number;
    healthScore: number;        // 0-100
    channelHealth: ChannelHealth[];
    recentIssues: ParityCheck[];
}

/**
 * Channel health metrics
 */
export interface ChannelHealth {
    channelId: string;
    channelName: string;
    totalChecks: number;
    issuesCount: number;
    healthScore: number;
    avgRateDiff: number;
    lastCheckAt: Date;
}

/**
 * Date range
 */
export interface DateRange {
    start: Date;
    end: Date;
}

/**
 * Parity Monitor Service
 */
export class ParityMonitor {
    private warningThresholdPct: number = 5;      // 5% difference
    private criticalThresholdPct: number = 10;    // 10% difference

    constructor(
        private readonly warningThreshold: number = 5,
        private readonly criticalThreshold: number = 10
    ) {
        this.warningThresholdPct = warningThreshold;
        this.criticalThresholdPct = criticalThreshold;
    }

    /**
     * Check parity between channels
     * 
     * @param channels - Channels to compare
     * @param dateRange - Date range to check
     * @returns Parity check results
     */
    async checkParity(
        channels: string[],
        dateRange: DateRange,
        options: {
            propertyId?: string;
            roomTypeId?: string;
        } = {}
    ): Promise<ParityCheck[]> {
        const tenantId = getCurrentTenantId();

        logger.info('Starting parity check', {
            tenantId,
            channels,
            dateRange,
            options
        });

        if (channels.length < 2) {
            throw new Error('At least 2 channels required for parity check');
        }

        const checks: ParityCheck[] = [];

        // Get rates for all channels
        const ratesPromises = channels.map(channelId =>
            this.getChannelRates(channelId, dateRange, options)
        );

        const channelRates = await Promise.all(ratesPromises);

        // Compare each pair
        for (let i = 0; i < channels.length; i++) {
            for (let j = i + 1; j < channels.length; j++) {
                const checksForPair = this.compareChannels(
                    channels[i],
                    channelRates[i],
                    channels[j],
                    channelRates[j]
                );
                checks.push(...checksForPair);
            }
        }

        // Persist checks
        await this.persistChecks(checks);

        logger.info('Parity check completed', {
            totalChecks: checks.length,
            ok: checks.filter(c => c.status === ParityStatus.OK).length,
            warnings: checks.filter(c => c.status === ParityStatus.WARNING).length,
            critical: checks.filter(c => c.status === ParityStatus.CRITICAL).length
        });

        return checks;
    }

    /**
     * Get rates for a channel
     */
    private async getChannelRates(
        channelId: string,
        dateRange: DateRange,
        options: { propertyId?: string; roomTypeId?: string }
    ): Promise<Map<string, { rate: number; inventory: number; key: string }>> {
        const rates = await prisma.rate.findMany({
            where: {
                date: {
                    gte: dateRange.start,
                    lte: dateRange.end
                },
                propertyId: options.propertyId,
                roomTypeId: options.roomTypeId
            },
            include: {
                roomType: true
            }
        });

        const inventory = await prisma.inventory.findMany({
            where: {
                date: {
                    gte: dateRange.start,
                    lte: dateRange.end
                },
                propertyId: options.propertyId,
                roomTypeId: options.roomTypeId
            }
        });

        const inventoryMap = new Map(
            inventory.map(inv => [
                `${inv.roomTypeId}_${inv.date.toISOString().split('T')[0]}`,
                inv.available
            ])
        );

        const result = new Map<string, { rate: number; inventory: number; key: string }>();

        rates.forEach(rate => {
            const key = `${rate.propertyId}_${rate.roomTypeId}_${rate.ratePlanCode}_${rate.date.toISOString().split('T')[0]}`;
            const invKey = `${rate.roomTypeId}_${rate.date.toISOString().split('T')[0]}`;

            result.set(key, {
                rate: Number(rate.amount),
                inventory: inventoryMap.get(invKey) || 0,
                key
            });
        });

        return result;
    }

    /**
     * Compare two channels
     */
    private compareChannels(
        channelA: string,
        ratesA: Map<string, { rate: number; inventory: number; key: string }>,
        channelB: string,
        ratesB: Map<string, { rate: number; inventory: number; key: string }>
    ): ParityCheck[] {
        const checks: ParityCheck[] = [];

        // Find common keys
        for (const [key, dataA] of ratesA) {
            const dataB = ratesB.get(key);
            if (!dataB) continue;

            const rateDiff = Math.abs(dataA.rate - dataB.rate);
            const rateDiffPct = (rateDiff / dataA.rate) * 100;
            const inventoryDiff = Math.abs(dataA.inventory - dataB.inventory);

            let status = ParityStatus.OK;
            if (rateDiffPct >= this.criticalThresholdPct) {
                status = ParityStatus.CRITICAL;
            } else if (rateDiffPct >= this.warningThresholdPct) {
                status = ParityStatus.WARNING;
            }

            // Parse key: propertyId_roomTypeId_ratePlanId_date
            const [propertyId, roomTypeId, ratePlanId, date] = key.split('_');

            checks.push({
                id: `${channelA}_${channelB}_${key}`,
                channelA,
                channelB,
                propertyId,
                roomTypeId,
                ratePlanId,
                date,
                rateA: dataA.rate,
                rateB: dataB.rate,
                rateDiff,
                rateDiffPct,
                inventoryA: dataA.inventory,
                inventoryB: dataB.inventory,
                inventoryDiff,
                status,
                checkedAt: new Date()
            });
        }

        return checks;
    }

    /**
     * Persist parity checks
     */
    private async persistChecks(checks: ParityCheck[]): Promise<void> {
        // Model ParityCheck doesn't exist yet, stubbing out
        logger.info('Parity checks persistence stubbed out', { count: checks.length });
    }

    /**
     * Alert on divergence
     * 
     * @param threshold - Minimum percentage difference to alert
     */
    async alertOnDivergence(threshold: number = 5): Promise<void> {
        // Model ParityCheck doesn't exist yet, stubbing out
        const recentIssues: any[] = [];

        if (recentIssues.length > 0) {
            logger.warn('Parity divergence detected', {
                count: recentIssues.length,
                maxDiff: recentIssues[0].rateDiffPct,
                issues: recentIssues.map(i => ({
                    channels: `${i.channelA} vs ${i.channelB}`,
                    diff: `${i.rateDiffPct.toFixed(2)}%`,
                    date: i.date
                }))
            });

            // TODO: Send alerts (email, Slack, PagerDuty)
        }
    }

    /**
     * Get parity dashboard
     */
    async getDashboard(
        dateRange?: DateRange
    ): Promise<ParityDashboard> {
        // Model ParityCheck doesn't exist yet, stubbing out
        const checks: ParityCheck[] = [];

        const totalChecks = checks.length;
        const okCount = checks.filter(c => c.status === ParityStatus.OK).length;
        const warningCount = checks.filter(c => c.status === ParityStatus.WARNING).length;
        const criticalCount = checks.filter(c => c.status === ParityStatus.CRITICAL).length;

        const healthScore = totalChecks > 0
            ? (okCount / totalChecks) * 100
            : 100;

        // Channel health
        const channelMap = new Map<string, ParityCheck[]>();
        checks.forEach(check => {
            if (!channelMap.has(check.channelA)) {
                channelMap.set(check.channelA, []);
            }
            if (!channelMap.has(check.channelB)) {
                channelMap.set(check.channelB, []);
            }
            channelMap.get(check.channelA)!.push(check);
            channelMap.get(check.channelB)!.push(check);
        });

        const channelHealth: ChannelHealth[] = Array.from(channelMap.entries()).map(
            ([channelId, channelChecks]) => {
                const issuesCount = channelChecks.filter(
                    c => c.status !== ParityStatus.OK
                ).length;
                const avgRateDiff = channelChecks.reduce(
                    (sum, c) => sum + c.rateDiffPct, 0
                ) / channelChecks.length;

                return {
                    channelId,
                    channelName: channelId, // TODO: Lookup channel name
                    totalChecks: channelChecks.length,
                    issuesCount,
                    healthScore: ((channelChecks.length - issuesCount) / channelChecks.length) * 100,
                    avgRateDiff,
                    lastCheckAt: channelChecks[channelChecks.length - 1].checkedAt
                };
            }
        );

        const recentIssues = checks
            .filter(c => c.status !== ParityStatus.OK)
            .sort((a, b) => b.rateDiffPct - a.rateDiffPct)
            .slice(0, 10);

        return {
            totalChecks,
            okCount,
            warningCount,
            criticalCount,
            healthScore,
            channelHealth,
            recentIssues
        };
    }
}

/**
 * Singleton instance
 */
export const parityMonitor = new ParityMonitor();
