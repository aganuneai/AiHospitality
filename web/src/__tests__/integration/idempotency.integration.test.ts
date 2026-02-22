import { POST as processAriEvent } from '@/app/api/v1/ari/events/route';
import { createMockRequest, extractJSON, testHotelId } from './test-utils';
import { prisma } from '@/lib/db';

describe('ARI Events - Idempotency Tests', () => {
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

        // Create inventory
        await prisma.inventory.create({
            data: {
                propertyId: testHotelId,
                roomTypeId: testRoomType.id,
                date: new Date('2026-10-01'),
                totalRooms: 10,
                availableRooms: 10,
                baseRate: 150.00
            }
        });
    });

    afterEach(async () => {
        // Clean up ARI events after each test
        await prisma.ariEvent.deleteMany({
            where: { propertyId: testHotelId }
        });
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    it('should process new event successfully', async () => {
        const eventId = `test-event-${Date.now()}`;

        const request = createMockRequest('http://localhost:3000/api/v1/ari/events', {
            method: 'POST',
            headers: {
                'x-channel-code': 'TEST_CHANNEL'
            },
            body: {
                eventId,
                eventType: 'AVAILABILITY',
                roomTypeCode: 'DELUXE',
                dateRange: {
                    from: '2026-10-01',
                    to: '2026-10-01'
                },
                payload: {
                    availability: 15
                }
            }
        });

        const response = await processAriEvent(request);
        const data = await extractJSON(response);

        expect(response.status).toBe(202);
        expect(data.eventId).toBe(eventId);
        expect(data.status).toMatch(/APPLIED|PENDING/);
    });

    it('should deduplicate events with same eventId', async () => {
        const eventId = `duplicate-test-${Date.now()}`;

        const payload = {
            eventId,
            eventType: 'AVAILABILITY',
            roomTypeCode: 'DELUXE',
            dateRange: {
                from: '2026-10-01',
                to: '2026-10-01'
            },
            payload: {
                availability: 20
            }
        };

        // First request
        const request1 = createMockRequest('http://localhost:3000/api/v1/ari/events', {
            method: 'POST',
            body: payload
        });
        const response1 = await processAriEvent(request1);
        const data1 = await extractJSON(response1);

        expect(response1.status).toBe(202);
        expect(data1.status).toMatch(/APPLIED|PENDING/);

        // Second request with same eventId (should be deduped)
        const request2 = createMockRequest('http://localhost:3000/api/v1/ari/events', {
            method: 'POST',
            body: payload
        });
        const response2 = await processAriEvent(request2);
        const data2 = await extractJSON(response2);

        expect(response2.status).toBe(409); // Conflict - already processed
        expect(data2.message).toContain('duplicate');
    });

    it('should process different events with different eventIds', async () => {
        const eventId1 = `event-1-${Date.now()}`;
        const eventId2 = `event-2-${Date.now()}`;

        // First event
        const request1 = createMockRequest('http://localhost:3000/api/v1/ari/events', {
            method: 'POST',
            body: {
                eventId: eventId1,
                eventType: 'AVAILABILITY',
                roomTypeCode: 'DELUXE',
                dateRange: { from: '2026-10-01', to: '2026-10-01' },
                payload: { availability: 8 }
            }
        });
        const response1 = await processAriEvent(request1);

        // Second event (different eventId)
        const request2 = createMockRequest('http://localhost:3000/api/v1/ari/events', {
            method: 'POST',
            body: {
                eventId: eventId2,
                eventType: 'AVAILABILITY',
                roomTypeCode: 'DELUXE',
                dateRange: { from: '2026-10-01', to: '2026-10-01' },
                payload: { availability: 12 }
            }
        });
        const response2 = await processAriEvent(request2);

        expect(response1.status).toBe(202);
        expect(response2.status).toBe(202);

        // Both should be processed
        const events = await prisma.ariEvent.findMany({
            where: { propertyId: testHotelId }
        });

        expect(events.length).toBeGreaterThanOrEqual(2);
    });

    it('should auto-generate eventId if not provided', async () => {
        const request = createMockRequest('http://localhost:3000/api/v1/ari/events', {
            method: 'POST',
            body: {
                // No eventId provided
                eventType: 'RATE',
                roomTypeCode: 'DELUXE',
                dateRange: { from: '2026-10-01', to: '2026-10-01' },
                payload: { rate: 180.00 }
            }
        });

        const response = await processAriEvent(request);
        const data = await extractJSON(response);

        expect(response.status).toBe(202);
        expect(data.eventId).toBeTruthy();
        expect(data.eventId).toMatch(/ari_/); // Should have generated ID
    });
});
