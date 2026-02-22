import { describe, it, expect, beforeEach } from 'vitest';
import { RestrictionValidator } from './validators';
import { RestrictionError, type Restriction, type Stay } from './types';

describe('RestrictionValidator', () => {
    let validator: RestrictionValidator;

    beforeEach(() => {
        validator = new RestrictionValidator();
    });

    describe('validateMinLOS', () => {
        const stay: Stay = {
            checkIn: new Date('2026-02-10'),
            checkOut: new Date('2026-02-13'), // 3 nights
            roomTypeCode: 'DLX',
            ratePlanCode: 'BAR'
        };

        it('should pass when stay meets minimum LOS', () => {
            const result = validator.validateMinLOS(stay, 2); // min 2 nights, got 3
            expect(result.valid).toBe(true);
        });

        it('should pass when stay exactly matches minimum LOS', () => {
            const result = validator.validateMinLOS(stay, 3); // min 3 nights, got 3
            expect(result.valid).toBe(true);
        });

        it('should fail when stay is shorter than minimum LOS', () => {
            const result = validator.validateMinLOS(stay, 5); // min 5 nights, got 3

            expect(result.valid).toBe(false);
            expect(result.error).toBe(RestrictionError.MIN_LOS_VIOLATION);
            expect(result.message).toContain('5 nights required');
            expect(result.message).toContain('3 nights requested');
        });
    });

    describe('validateMaxLOS', () => {
        const stay: Stay = {
            checkIn: new Date('2026-03-01'),
            checkOut: new Date('2026-03-08'), // 7 nights
            roomTypeCode: 'STD',
            ratePlanCode: 'PROMO'
        };

        it('should pass when stay is within maximum LOS', () => {
            const result = validator.validateMaxLOS(stay, 10); // max 10 nights, got 7
            expect(result.valid).toBe(true);
        });

        it('should pass when stay exactly matches maximum LOS', () => {
            const result = validator.validateMaxLOS(stay, 7); // max 7 nights, got 7
            expect(result.valid).toBe(true);
        });

        it('should fail when stay exceeds maximum LOS', () => {
            const result = validator.validateMaxLOS(stay, 5); // max 5 nights, got 7

            expect(result.valid).toBe(false);
            expect(result.error).toBe(RestrictionError.MAX_LOS_VIOLATION);
            expect(result.message).toContain('5 nights allowed');
            expect(result.message).toContain('7 nights requested');
        });
    });

    describe('validateCTA', () => {
        const checkInDate = new Date('2026-04-15');

        it('should pass when no CTA restriction exists', () => {
            const restrictions: Restriction[] = [
                {
                    id: '1',
                    propertyId: 'H001',
                    roomTypeId: 'RT001',
                    date: new Date('2026-04-15'),
                    closedToArrival: false,  // NOT closed
                    closedToDeparture: false,
                    minLos: null,
                    maxLos: null,
                    stopSell: false,
                    closed: false,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ];

            const result = validator.validateCTA(checkInDate, restrictions);
            expect(result.valid).toBe(true);
        });

        it('should fail when CTA restriction exists', () => {
            const restrictions: Restriction[] = [
                {
                    id: '1',
                    propertyId: 'H001',
                    roomTypeId: 'RT001',
                    date: new Date('2026-04-15'),
                    closedToArrival: true,  // CLOSED!
                    closedToDeparture: false,
                    minLos: null,
                    maxLos: null,
                    stopSell: false,
                    closed: false,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ];

            const result = validator.validateCTA(checkInDate, restrictions);

            expect(result.valid).toBe(false);
            expect(result.error).toBe(RestrictionError.CTA_VIOLATION);
            expect(result.message).toContain('Check-in not allowed');
            expect(result.message).toContain('2026-04-15');
        });
    });

    describe('validateCTD', () => {
        const checkOutDate = new Date('2026-05-20');

        it('should pass when no CTD restriction exists', () => {
            const restrictions: Restriction[] = [
                {
                    id: '1',
                    propertyId: 'H001',
                    roomTypeId: 'RT001',
                    date: new Date('2026-05-20'),
                    closedToArrival: false,
                    closedToDeparture: false,  // NOT closed
                    minLos: null,
                    maxLos: null,
                    stopSell: false,
                    closed: false,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ];

            const result = validator.validateCTD(checkOutDate, restrictions);
            expect(result.valid).toBe(true);
        });

        it('should fail when CTD restriction exists', () => {
            const restrictions: Restriction[] = [
                {
                    id: '1',
                    propertyId: 'H001',
                    roomTypeId: 'RT001',
                    date: new Date('2026-05-20'),
                    closedToArrival: false,
                    closedToDeparture: true,  // CLOSED!
                    minLos: null,
                    maxLos: null,
                    stopSell: false,
                    closed: false,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ];

            const result = validator.validateCTD(checkOutDate, restrictions);

            expect(result.valid).toBe(false);
            expect(result.error).toBe(RestrictionError.CTD_VIOLATION);
            expect(result.message).toContain('Check-out not allowed');
            expect(result.message).toContain('2026-05-20');
        });
    });

    describe('validateStopSell', () => {
        const dates = [
            new Date('2026-06-01'),
            new Date('2026-06-02'),
            new Date('2026-06-03')
        ];

        it('should pass when no stop-sell restriction exists', () => {
            const restrictions: Restriction[] = dates.map((date, idx) => ({
                id: `${idx}`,
                propertyId: 'H001',
                roomTypeId: 'RT001',
                date,
                closedToArrival: false,
                closedToDeparture: false,
                minLos: null,
                maxLos: null,
                stopSell: false,  // NOT stop-sell
                closed: false,
                createdAt: new Date(),
                updatedAt: new Date()
            }));

            const result = validator.validateStopSell(dates, restrictions);
            expect(result.valid).toBe(true);
        });

        it('should fail when stop-sell restriction exists on any date', () => {
            const restrictions: Restriction[] = [
                {
                    id: '1',
                    propertyId: 'H001',
                    roomTypeId: 'RT001',
                    date: new Date('2026-06-02'),  // Middle date
                    closedToArrival: false,
                    closedToDeparture: false,
                    minLos: null,
                    maxLos: null,
                    stopSell: true,  // STOP SELL!
                    closed: false,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ];

            const result = validator.validateStopSell(dates, restrictions);

            expect(result.valid).toBe(false);
            expect(result.error).toBe(RestrictionError.STOP_SELL);
            expect(result.message).toContain('Sales stopped');
            expect(result.message).toContain('2026-06-02');
        });
    });

    describe('validateClosed', () => {
        const dates = [
            new Date('2026-07-10'),
            new Date('2026-07-11'),
            new Date('2026-07-12')
        ];

        it('should pass when room is not closed', () => {
            const restrictions: Restriction[] = dates.map((date, idx) => ({
                id: `${idx}`,
                propertyId: 'H001',
                roomTypeId: 'RT001',
                date,
                closedToArrival: false,
                closedToDeparture: false,
                minLos: null,
                maxLos: null,
                stopSell: false,
                closed: false,  // NOT closed
                createdAt: new Date(),
                updatedAt: new Date()
            }));

            const result = validator.validateClosed(dates, restrictions);
            expect(result.valid).toBe(true);
        });

        it('should fail when room is closed on any date', () => {
            const restrictions: Restriction[] = [
                {
                    id: '1',
                    propertyId: 'H001',
                    roomTypeId: 'RT001',
                    date: new Date('2026-07-11'),  // Middle date
                    closedToArrival: false,
                    closedToDeparture: false,
                    minLos: null,
                    maxLos: null,
                    stopSell: false,
                    closed: true,  // CLOSED!
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ];

            const result = validator.validateClosed(dates, restrictions);

            expect(result.valid).toBe(false);
            expect(result.error).toBe(RestrictionError.ROOM_CLOSED);
            expect(result.message).toContain('closed');
            expect(result.message).toContain('2026-07-11');
        });
    });

    describe('getStayDates', () => {
        it('should return correct dates for 3-night stay', () => {
            const checkIn = new Date('2026-08-10');
            const checkOut = new Date('2026-08-13');

            const dates = validator.getStayDates(checkIn, checkOut);

            expect(dates).toHaveLength(3);
            expect(dates[0]).toEqual(new Date('2026-08-10'));
            expect(dates[1]).toEqual(new Date('2026-08-11'));
            expect(dates[2]).toEqual(new Date('2026-08-12'));
            // Note: checkout date (08-13) is NOT included (inventory is by night)
        });

        it('should return 1 date for 1-night stay', () => {
            const checkIn = new Date('2026-09-15');
            const checkOut = new Date('2026-09-16');

            const dates = validator.getStayDates(checkIn, checkOut);

            expect(dates).toHaveLength(1);
            expect(dates[0]).toEqual(new Date('2026-09-15'));
        });

        it('should return empty array for same-day check-in/out', () => {
            const checkIn = new Date('2026-10-01');
            const checkOut = new Date('2026-10-01');

            const dates = validator.getStayDates(checkIn, checkOut);

            expect(dates).toHaveLength(0);
        });
    });
});
