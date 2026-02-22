import { POST as updateAvailability } from '@/app/api/v1/ari/availability/route';
import { POST as updateRates } from '@/app/api/v1/ari/rates/route';
import { GET as getCalendar } from '@/app/api/v1/ari/calendar/route';
import { createMockRequest, extractJSON, testHotelId } from './test-utils';
import { prisma } from '@/lib/db';

describe('ARI Endpoints - Integration Tests', () => {
    let testRoomType: any;

    beforeAll(async () => {
        // Create test room type
        testRoomType = await prisma.roomType.upsert({
            where: { propertyId_code: { propertyId: testHotelId, code: 'DELUXE' } },
            create: {
                propertyId: testHotelId,
                code: 'DELUXE',
                name: 'Deluxe Room',
                description: 'Test room',
                baseOccupancy: 2,
                maxOccupancy: 3
            },
            update: {}
        });

        // Create initial inventory
        const dates = ['2026-09-01', '2026-09-02', '2026-09-03'];
        for (const dateStr of dates) {
            await prisma.inventory.upsert({
                where: {
                    propertyId_roomTypeId_date: {
                        propertyId: testHotelId,
                        roomTypeId: testRoomType.id,
                        date: new Date(dateStr)
                    }
                },
                create: {
                    propertyId: testHotelId,
                    roomTypeId: testRoomType.id,
                    date: new Date(dateStr),
                    totalRooms: 15,
                    availableRooms: 15,
                    baseRate: 200.00
                },
                update: {
                    availableRooms: 15
                }
            });
        }
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    describe('POST /api/v1/ari/availability', () => {
        it('should update availability successfully', async () => {
            const request = createMockRequest('http://localhost:3000/api/v1/ari/availability', {
                method: 'POST',
                body: {
                    roomTypeCode: 'DELUXE',
                    dateRange: {
                        from: '2026-09-01',
                        to: '2026-09-03'
                    },
                    availability: 20,
                    updateType: 'SET'
                }
            });

            const response = await updateAvailability(request);
            const data = await extractJSON(response);

            expect(response.status).toBe(200);
            expect(data.updated).toBe(3); // 3 days updated
            expect(data.availability).toBe(20);
        });

        it('should require valid updateType', async () => {
            const request = createMockRequest('http://localhost:3000/api/v1/ari/availability', {
                method: 'POST',
                body: {
                    roomTypeCode: 'DELUXE',
                    dateRange: {
                        from: '2026-09-01',
                        to: '2026-09-03'
                    },
                    availability: 20,
                    updateType: 'INVALID'
                }
            });

            const response = await updateAvailability(request);
            expect(response.status).toBe(400);
        });
    });

    describe('POST /api/v1/ari/rates', () => {
        it('should update rates successfully', async () => {
            const request = createMockRequest('http://localhost:3000/api/v1/ari/rates', {
                method: 'POST',
                body: {
                    roomTypeCode: 'DELUXE',
                    dateRange: {
                        from: '2026-09-01',
                        to: '2026-09-03'
                    },
                    baseRate: 250.00
                }
            });

            const response = await updateRates(request);
            const data = await extractJSON(response);

            expect(response.status).toBe(200);
            expect(data.updated).toBe(3);
            expect(data.avgRate).toBe(250.00);
        });

        it('should validate rate is positive', async () => {
            const request = createMockRequest('http://localhost:3000/api/v1/ari/rates', {
                method: 'POST',
                body: {
                    roomTypeCode: 'DELUXE',
                    dateRange: {
                        from: '2026-09-01',
                        to: '2026-09-03'
                    },
                    baseRate: -100 // Invalid negative rate
                }
            });

            const response = await updateRates(request);
            expect(response.status).toBe(400);
        });
    });

    describe('GET /api/v1/ari/calendar', () => {
        it('should fetch calendar data successfully', async () => {
            const request = createMockRequest(
                'http://localhost:3000/api/v1/ari/calendar?roomType=DELUXE&from=2026-09-01&to=2026-09-03'
            );

            const response = await getCalendar(request);
            const data = await extractJSON(response);

            expect(response.status).toBe(200);
            expect(data.roomTypeCode).toBe('DELUXE');
            expect(data.days.length).toBe(3);

            const firstDay = data.days[0];
            expect(firstDay).toHaveProperty('date');
            expect(firstDay).toHaveProperty('available');
            expect(firstDay).toHaveProperty('total');
            expect(firstDay).toHaveProperty('rate');
            expect(firstDay).toHaveProperty('restrictions');
        });

        it('should require roomType query param', async () => {
            const request = createMockRequest(
                'http://localhost:3000/api/v1/ari/calendar?from=2026-09-01&to=2026-09-03'
                // Missing roomType
            );

            const response = await getCalendar(request);
            expect(response.status).toBe(400);
        });

        it('should validate date range', async () => {
            const request = createMockRequest(
                'http://localhost:3000/api/v1/ari/calendar?roomType=DELUXE&from=2026-09-10&to=2026-09-05'
                // Invalid: from is after to
            );

            const response = await getCalendar(request);
            expect(response.status).toBe(400);
        });
    });
});
