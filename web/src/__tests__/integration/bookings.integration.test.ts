import { POST as createBooking } from '@/app/api/v1/bookings/route';
import { GET as listBookings } from '@/app/api/v1/bookings/route';
import { createMockRequest, extractJSON, generateIdempotencyKey, testHotelId } from './test-utils';
import { prisma } from '@/lib/db';

describe('POST /api/v1/bookings - Integration Tests', () => {
    beforeEach(async () => {
        // Clean up test data
        await prisma.reservation.deleteMany({
            where: { propertyId: testHotelId }
        });
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    it('should create a new booking successfully', async () => {
        const idempotencyKey = generateIdempotencyKey();

        const request = createMockRequest('http://localhost:3000/api/v1/bookings', {
            method: 'POST',
            body: {
                idempotencyKey,
                quoteId: 'quote-test-123',
                pricingSignature: 'SIG_test',
                stay: {
                    checkIn: '2026-08-01',
                    checkOut: '2026-08-03',
                    adults: 2,
                    children: 0
                },
                roomTypeCode: 'DELUXE',
                ratePlanCode: 'BAR',
                primaryGuest: {
                    firstName: 'Test',
                    lastName: 'User',
                    email: 'test@example.com',
                    phone: '+5511999999999'
                }
            }
        });

        const response = await createBooking(request);
        const data = await extractJSON(response);

        expect(response.status).toBe(201);
        expect(data.booking).toHaveProperty('reservationId');
        expect(data.booking).toHaveProperty('pnr');
        expect(data.booking.status).toBe('CONFIRMED');
        expect(data.booking.total).toBeGreaterThan(0);
    });

    it('should return 400 if required fields are missing', async () => {
        const request = createMockRequest('http://localhost:3000/api/v1/bookings', {
            method: 'POST',
            body: {
                // Missing idempotencyKey and other required fields
                stay: {
                    checkIn: '2026-08-01'
                }
            }
        });

        const response = await createBooking(request);
        const data = await extractJSON(response);

        expect(response.status).toBe(400);
        expect(data).toHaveProperty('code');
        expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('should enforce idempotency - same key returns same booking', async () => {
        const idempotencyKey = generateIdempotencyKey();

        const payload = {
            idempotencyKey,
            quoteId: 'quote-test-456',
            pricingSignature: 'SIG_test2',
            stay: {
                checkIn: '2026-08-10',
                checkOut: '2026-08-12',
                adults: 1,
                children: 0
            },
            roomTypeCode: 'STANDARD',
            ratePlanCode: 'BAR',
            primaryGuest: {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com'
            }
        };

        // First request
        const request1 = createMockRequest('http://localhost:3000/api/v1/bookings', {
            method: 'POST',
            body: payload
        });
        const response1 = await createBooking(request1);
        const data1 = await extractJSON(response1);

        expect(response1.status).toBe(201);
        const reservationId1 = data1.booking.reservationId;

        // Second request with same idempotency key
        const request2 = createMockRequest('http://localhost:3000/api/v1/bookings', {
            method: 'POST',
            body: payload
        });
        const response2 = await createBooking(request2);
        const data2 = await extractJSON(response2);

        expect(response2.status).toBe(409);
        expect(data2.booking.reservationId).toBe(reservationId1);
    });

    it('should require x-hotel-id header', async () => {
        const request = createMockRequest('http://localhost:3000/api/v1/bookings', {
            method: 'POST',
            headers: {
                'x-hotel-id': '' // Empty hotel ID
            },
            body: {
                idempotencyKey: generateIdempotencyKey(),
                stay: { checkIn: '2026-08-01', checkOut: '2026-08-03', adults: 2, children: 0 },
                roomTypeCode: 'DELUXE',
                ratePlanCode: 'BAR',
                primaryGuest: { firstName: 'Test', lastName: 'User', email: 'test@example.com' }
            }
        });

        const response = await createBooking(request);
        const data = await extractJSON(response);

        expect(response.status).toBe(400);
        expect(data.code).toBe('CONTEXT_INVALID');
    });
});

describe('GET /api/v1/bookings - Integration Tests', () => {
    beforeAll(async () => {
        // Create some test reservations
        await prisma.reservation.create({
            data: {
                pnr: 'TESTPNR1',
                propertyId: testHotelId,
                status: 'CONFIRMED',
                checkIn: new Date('2026-08-01'),
                checkOut: new Date('2026-08-03'),
                guests: {
                    create: {
                        firstName: 'Test',
                        lastName: 'Guest',
                        email: 'test@example.com',
                        isPrimary: true
                    }
                },
                roomAssignments: {
                    create: {
                        roomTypeCode: 'DELUXE',
                        ratePlanCode: 'BAR',
                        adults: 2,
                        children: 0
                    }
                }
            }
        });
    });

    afterAll(async () => {
        await prisma.reservation.deleteMany({
            where: { propertyId: testHotelId }
        });
        await prisma.$disconnect();
    });

    it('should list bookings successfully', async () => {
        const request = createMockRequest('http://localhost:3000/api/v1/bookings');

        const response = await listBookings(request);
        const data = await extractJSON(response);

        expect(response.status).toBe(200);
        expect(data).toHaveProperty('bookings');
        expect(Array.isArray(data.bookings)).toBe(true);
        expect(data.bookings.length).toBeGreaterThan(0);
    });

    it('should filter bookings by status', async () => {
        const request = createMockRequest('http://localhost:3000/api/v1/bookings?status=CONFIRMED');

        const response = await listBookings(request);
        const data = await extractJSON(response);

        expect(response.status).toBe(200);
        expect(data.bookings.every((b: any) => b.status === 'CONFIRMED')).toBe(true);
    });

    it('should filter bookings by PNR', async () => {
        const request = createMockRequest('http://localhost:3000/api/v1/bookings?pnr=TESTPNR1');

        const response = await listBookings(request);
        const data = await extractJSON(response);

        expect(response.status).toBe(200);
        expect(data.bookings.length).toBeGreaterThan(0);
        expect(data.bookings[0].pnr).toContain('TESTPNR1');
    });
});
