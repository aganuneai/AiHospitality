import { POST as createQuote } from '@/app/api/v1/quotes/route';
import { createMockRequest, extractJSON, testHotelId } from './test-utils';
import { prisma } from '@/lib/db';

describe('POST /api/v1/quotes - Integration Tests', () => {
    beforeAll(async () => {
        // Ensure test room types and inventory exist
        const roomType = await prisma.roomType.upsert({
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

        // Create inventory for testing
        const dates = ['2026-08-01', '2026-08-02', '2026-08-03'];
        for (const dateStr of dates) {
            await prisma.inventory.upsert({
                where: {
                    propertyId_roomTypeId_date: {
                        propertyId: testHotelId,
                        roomTypeId: roomType.id,
                        date: new Date(dateStr)
                    }
                },
                create: {
                    propertyId: testHotelId,
                    roomTypeId: roomType.id,
                    date: new Date(dateStr),
                    totalRooms: 10,
                    availableRooms: 10,
                    baseRate: 200.00
                },
                update: {
                    availableRooms: 10
                }
            });
        }
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    it('should generate quotes successfully', async () => {
        const request = createMockRequest('http://localhost:3000/api/v1/quotes', {
            method: 'POST',
            body: {
                stay: {
                    checkIn: '2026-08-01',
                    checkOut: '2026-08-03',
                    adults: 2,
                    children: 0
                }
            }
        });

        const response = await createQuote(request);
        const data = await extractJSON(response);

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('quotes');
        expect(Array.isArray(data.quotes)).toBe(true);
        expect(data.quotes.length).toBeGreaterThan(0);

        const quote = data.quotes[0];
        expect(quote).toHaveProperty('quoteId');
        expect(quote).toHaveProperty('pricingSignature');
        expect(quote).toHaveProperty('total');
        expect(quote.total).toBeGreaterThan(0);
    });

    it('should calculate correct pricing for 2 nights', async () => {
        const request = createMockRequest('http://localhost:3000/api/v1/quotes', {
            method: 'POST',
            body: {
                stay: {
                    checkIn: '2026-08-01',
                    checkOut: '2026-08-03', // 2 nights
                    adults: 2,
                    children: 0
                }
            }
        });

        const response = await createQuote(request);
        const data = await extractJSON(response);

        expect(response.status).toBe(200);
        const quote = data.quotes[0];

        // 2 nights at $200/night = $400 base + taxes/fees
        expect(quote.total).toBeGreaterThan(400);
        expect(quote.breakdown.length).toBe(2);
    });

    it('should return 400 if checkIn is after checkOut', async () => {
        const request = createMockRequest('http://localhost:3000/api/v1/quotes', {
            method: 'POST',
            body: {
                stay: {
                    checkIn: '2026-08-10',
                    checkOut: '2026-08-05', // Invalid: before checkIn
                    adults: 2,
                    children: 0
                }
            }
        });

        const response = await createQuote(request);
        const data = await extractJSON(response);

        expect(response.status).toBe(400);
        expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('should filter quotes by roomTypes if provided', async () => {
        const request = createMockRequest('http://localhost:3000/api/v1/quotes', {
            method: 'POST',
            body: {
                stay: {
                    checkIn: '2026-08-01',
                    checkOut: '2026-08-03',
                    adults: 2,
                    children: 0
                },
                roomTypes: ['DELUXE']
            }
        });

        const response = await createQuote(request);
        const data = await extractJSON(response);

        expect(response.status).toBe(200);
        expect(data.quotes.every((q: any) => q.roomTypeCode === 'DELUXE')).toBe(true);
    });

    it('should use cache on subsequent requests', async () => {
        const payload = {
            stay: {
                checkIn: '2026-08-01',
                checkOut: '2026-08-03',
                adults: 2,
                children: 0
            }
        };

        // First request
        const request1 = createMockRequest('http://localhost:3000/api/v1/quotes', {
            method: 'POST',
            body: payload
        });
        const response1 = await createQuote(request1);
        const data1 = await extractJSON(response1);

        expect(response1.status).toBe(200);
        expect(data1.cached).toBe(false);

        // Second request (should be cached)
        const request2 = createMockRequest('http://localhost:3000/api/v1/quotes', {
            method: 'POST',
            body: payload
        });
        const response2 = await createQuote(request2);
        const data2 = await extractJSON(response2);

        expect(response2.status).toBe(200);
        expect(data2.cached).toBe(true);
        expect(data2.quotes[0].quoteId).toBe(data1.quotes[0].quoteId);
    });
});
