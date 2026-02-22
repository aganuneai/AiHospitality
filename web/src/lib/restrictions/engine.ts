/**
 * Restriction Engine
 * 
 * Orchestrates all restriction validators and provides a single entry point
 * for validating quote requests against business rules.
 */

import { eachDayOfInterval } from 'date-fns';
import { prisma } from '../db';
import { RestrictionValidator } from './validators';
import {
    RestrictionContext,
    RestrictionValidation,
    Restriction,
    Stay
} from './types';

export class RestrictionEngine {
    private validator = new RestrictionValidator();

    /**
     * Validate a quote request against all restriction rules
     * 
     * Checks in order of severity:
     * 1. Closed (strongest - nothing allowed)
     * 2. Stop-sell (no new bookings)
     * 3. CTA (check-in date blocked)
     * 4. CTD (check-out date blocked)
     * 5. Min LOS (minimum stay duration)
     * 6. Max LOS (maximum stay duration)
     * 
     * Returns early on first failure.
     * 
     * @param context - Validation context (property, room, dates)
     * @returns Validation result
     */
    async validateQuote(context: RestrictionContext): Promise<RestrictionValidation> {
        const { propertyId, roomTypeCode, ratePlanCode, checkIn, checkOut } = context;

        // Fetch all restrictions for the date range
        const restrictions = await this.fetchRestrictions(
            propertyId,
            roomTypeCode,
            checkIn,
            checkOut
        );

        const stay: Stay = {
            checkIn,
            checkOut,
            roomTypeCode,
            ratePlanCode
        };

        // Get all dates in the stay
        const dates = eachDayOfInterval({ start: checkIn, end: checkOut });
        // Remove check-out date (inventory is by night, not by day)
        const stayDates = dates.slice(0, -1);

        // 1. CLOSED (strongest restriction)
        const closedResult = this.validator.validateClosed(stayDates, restrictions);
        if (!closedResult.valid) return closedResult;

        // 2. STOP-SELL
        const stopSellResult = this.validator.validateStopSell(stayDates, restrictions);
        if (!stopSellResult.valid) return stopSellResult;

        // 3. CTA (Close To Arrival)
        const ctaResult = this.validator.validateCTA(checkIn, restrictions);
        if (!ctaResult.valid) return ctaResult;

        // 4. CTD (Close To Departure)
        const ctdResult = this.validator.validateCTD(checkOut, restrictions);
        if (!ctdResult.valid) return ctdResult;

        // 5. MIN LOS (aggregate - find the HIGHEST minLos in the date range)
        const minLosRestrictions = restrictions.filter(r => r.minLOS !== null && r.minLOS > 0);
        if (minLosRestrictions.length > 0) {
            const highestMinLos = Math.max(...minLosRestrictions.map(r => r.minLOS!));
            const minLosResult = this.validator.validateMinLOS(stay, highestMinLos);
            if (!minLosResult.valid) return minLosResult;
        }

        // 6. MAX LOS (aggregate - find the LOWEST maxLos in the date range)
        const maxLosRestrictions = restrictions.filter(r => r.maxLOS !== null && r.maxLOS > 0);
        if (maxLosRestrictions.length > 0) {
            const lowestMaxLos = Math.min(...maxLosRestrictions.map(r => r.maxLOS!));
            const maxLosResult = this.validator.validateMaxLOS(stay, lowestMaxLos);
            if (!maxLosResult.valid) return maxLosResult;
        }

        // All validations passed
        return { valid: true };
    }

    /**
     * Fetch all restrictions for a given room type and date range
     * 
     * @param propertyId - Hotel ID
     * @param roomTypeCode - Room type code
     * @param from - Start date
     * @param to - End date
     * @returns Array of restrictions
     */
    private async fetchRestrictions(
        propertyId: string,
        roomTypeCode: string,
        from: Date,
        to: Date
    ): Promise<Restriction[]> {
        // First, get roomTypeId from code
        const roomType = await prisma.roomType.findUnique({
            where: {
                propertyId_code: {
                    propertyId,
                    code: roomTypeCode
                }
            }
        });

        if (!roomType) {
            // No room type = no restrictions (this should be caught earlier in quote flow)
            return [];
        }

        // Fetch restrictions
        const restrictions = await prisma.restriction.findMany({
            where: {
                propertyId,
                roomTypeId: roomType.id,
                date: {
                    gte: from,
                    lt: to  // Exclusive of check-out date
                }
            },
            orderBy: {
                date: 'asc'
            }
        });

        return restrictions;
    }

    /**
     * Check if a specific restriction type is active on a date
     * 
     * Utility method for quick checks without full validation.
     * 
     * @param propertyId - Hotel ID
     * @param roomTypeCode - Room type code
     * @param date - Date to check
     * @param restrictionType - Type of restriction to check
     * @returns True if restriction is active
     */
    async hasRestriction(
        propertyId: string,
        roomTypeCode: string,
        date: Date,
        restrictionType: 'closed' | 'stopSell' | 'cta' | 'ctd'
    ): Promise<boolean> {
        const roomType = await prisma.roomType.findUnique({
            where: {
                propertyId_code: { propertyId, code: roomTypeCode }
            }
        });

        if (!roomType) return false;

        const restriction = await prisma.restriction.findFirst({
            where: {
                propertyId,
                roomTypeId: roomType.id,
                date,
                [restrictionType]: true
            }
        });

        return !!restriction;
    }

    /**
     * Get all active restrictions for a date range (for display purposes)
     * 
     * @param propertyId - Hotel ID
     * @param roomTypeCode - Room type code
     * @param from - Start date
     * @param to - End date
     * @returns Summary of restrictions
     */
    async getRestrictionSummary(
        propertyId: string,
        roomTypeCode: string,
        from: Date,
        to: Date
    ) {
        const restrictions = await this.fetchRestrictions(propertyId, roomTypeCode, from, to);

        return {
            total: restrictions.length,
            closed: restrictions.filter(r => r.closed).length,
            stopSell: restrictions.filter(r => r.stopSell).length,
            closedToArrival: restrictions.filter(r => r.closedToArrival).length,
            closedToDeparture: restrictions.filter(r => r.closedToDeparture).length,
            minLos: restrictions.filter(r => r.minLOS !== null).length,
            maxLos: restrictions.filter(r => r.maxLOS !== null).length,
            restrictions
        };
    }
}

// Export singleton instance
export const restrictionEngine = new RestrictionEngine();
