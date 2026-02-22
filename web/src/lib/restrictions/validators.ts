/**
 * Restriction Validators
 * 
 * Individual validators for each restriction type.
 * Each validator follows the same pattern: check condition, return validation result.
 */

import { differenceInDays, format, isSameDay } from 'date-fns';
import {
    RestrictionType,
    RestrictionError,
    RestrictionValidation,
    Restriction,
    Stay
} from './types';

export class RestrictionValidator {
    /**
     * Validate Minimum Length of Stay
     * 
     * Ensures the stay duration meets the minimum required nights.
     * 
     * @param stay - Stay details
     * @param minLosValue - Minimum nights required
     * @returns Validation result
     */
    validateMinLOS(stay: Stay, minLosValue: number): RestrictionValidation {
        const los = differenceInDays(stay.checkOut, stay.checkIn);

        if (los < minLosValue) {
            return {
                valid: false,
                error: RestrictionError.MIN_LOS_VIOLATION,
                message: `Minimum ${minLosValue} night${minLosValue > 1 ? 's' : ''} required, but only ${los} night${los > 1 ? 's' : ''} requested`,
                restriction: {
                    type: RestrictionType.MIN_LOS,
                    value: minLosValue
                }
            };
        }

        return { valid: true };
    }

    /**
     * Validate Maximum Length of Stay
     * 
     * Ensures the stay duration doesn't exceed the maximum allowed nights.
     * 
     * @param stay - Stay details
     * @param maxLosValue - Maximum nights allowed
     * @returns Validation result
     */
    validateMaxLOS(stay: Stay, maxLosValue: number): RestrictionValidation {
        const los = differenceInDays(stay.checkOut, stay.checkIn);

        if (los > maxLosValue) {
            return {
                valid: false,
                error: RestrictionError.MAX_LOS_VIOLATION,
                message: `Maximum ${maxLosValue} night${maxLosValue > 1 ? 's' : ''} allowed, but ${los} night${los > 1 ? 's' : ''} requested`,
                restriction: {
                    type: RestrictionType.MAX_LOS,
                    value: maxLosValue
                }
            };
        }

        return { valid: true };
    }

    /**
     * Validate Close To Arrival (CTA)
     * 
     * Checks if check-in is allowed on the requested date.
     * 
     * @param checkInDate - Requested check-in date
     * @param restrictions - All restrictions for the date range
     * @returns Validation result
     */
    validateCTA(checkInDate: Date, restrictions: Restriction[]): RestrictionValidation {
        const ctaRestriction = restrictions.find(r =>
            isSameDay(r.date, checkInDate) && r.closedToArrival
        );

        if (ctaRestriction) {
            return {
                valid: false,
                error: RestrictionError.CTA_VIOLATION,
                message: `Check-in not allowed on ${format(checkInDate, 'yyyy-MM-dd')}. This date is closed to arrival.`,
                restriction: {
                    type: RestrictionType.CTA,
                    date: checkInDate
                }
            };
        }

        return { valid: true };
    }

    /**
     * Validate Close To Departure (CTD)
     * 
     * Checks if check-out is allowed on the requested date.
     * 
     * @param checkOutDate - Requested check-out date
     * @param restrictions - All restrictions for the date range
     * @returns Validation result
     */
    validateCTD(checkOutDate: Date, restrictions: Restriction[]): RestrictionValidation {
        const ctdRestriction = restrictions.find(r =>
            isSameDay(r.date, checkOutDate) && r.closedToDeparture
        );

        if (ctdRestriction) {
            return {
                valid: false,
                error: RestrictionError.CTD_VIOLATION,
                message: `Check-out not allowed on ${format(checkOutDate, 'yyyy-MM-dd')}. This date is closed to departure.`,
                restriction: {
                    type: RestrictionType.CTD,
                    date: checkOutDate
                }
            };
        }

        return { valid: true };
    }

    /**
     * Validate Stop-Sell
     * 
     * Checks if any date in the stay has stop-sell restriction.
     * When stop-sell is active, no new bookings are accepted.
     * 
     * @param dates - All dates in the stay
     * @param restrictions - All restrictions for the date range
     * @returns Validation result
     */
    validateStopSell(dates: Date[], restrictions: Restriction[]): RestrictionValidation {
        for (const date of dates) {
            const stopSellRestriction = restrictions.find(r =>
                isSameDay(r.date, date) && r.stopSell
            );

            if (stopSellRestriction) {
                return {
                    valid: false,
                    error: RestrictionError.STOP_SELL,
                    message: `Sales stopped for ${format(date, 'yyyy-MM-dd')}. No new bookings accepted.`,
                    restriction: {
                        type: RestrictionType.STOP_SELL,
                        date
                    }
                };
            }
        }

        return { valid: true };
    }

    /**
     * Validate Closed
     * 
     * Checks if the room type is completely closed on any date in the stay.
     * This is the strongest restriction - nothing is allowed.
     * 
     * @param dates - All dates in the stay
     * @param restrictions - All restrictions for the date range
     * @returns Validation result
     */
    validateClosed(dates: Date[], restrictions: Restriction[]): RestrictionValidation {
        for (const date of dates) {
            const closedRestriction = restrictions.find(r =>
                isSameDay(r.date, date) && r.closed
            );

            if (closedRestriction) {
                return {
                    valid: false,
                    error: RestrictionError.ROOM_CLOSED,
                    message: `Room type closed on ${format(date, 'yyyy-MM-dd')}. Not available for booking.`,
                    restriction: {
                        type: RestrictionType.CLOSED,
                        date
                    }
                };
            }
        }

        return { valid: true };
    }

    /**
     * Helper: Get all dates in a stay (inclusive of check-in, exclusive of check-out)
     * 
     * In hospitality, inventory is managed by night, not by date.
     * If checking in on Feb 10 and out on Feb 13, you occupy Feb 10, 11, 12 (3 nights).
     * 
     * @param checkIn - Check-in date
     * @param checkOut - Check-out date
     * @returns Array of dates representing each night
     */
    getStayDates(checkIn: Date, checkOut: Date): Date[] {
        const dates: Date[] = [];
        const currentDate = new Date(checkIn);

        while (currentDate < checkOut) {
            dates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return dates;
    }
}
