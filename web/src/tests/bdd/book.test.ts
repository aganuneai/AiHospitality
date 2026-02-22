import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookSaga } from '@/lib/workflows/book/book.saga';
import { BookRequest } from '@/lib/schemas/booking/booking.schema';
import { IdempotencyService } from '@/lib/services/idempotency';
import { BookService } from '@/lib/services/book-service';

// Define mock instances to control behavior in tests, using vi.hoisted to bypass hoisting limitations
const { mockIdempotencyServiceInstance, mockBookServiceInstance } = vi.hoisted(() => {
    return {
        mockIdempotencyServiceInstance: {
            get: vi.fn(),
            lock: vi.fn(),
            complete: vi.fn(),
            fail: vi.fn()
        },
        mockBookServiceInstance: {
            createReservation: vi.fn()
        }
    };
});

// Mock the modules and return the mock class constructor
vi.mock('@/lib/services/idempotency', () => {
    return {
        IdempotencyService: class {
            constructor() {
                return mockIdempotencyServiceInstance;
            }
        }
    };
});

vi.mock('@/lib/services/book-service', () => {
    return {
        BookService: class {
            constructor() {
                return mockBookServiceInstance;
            }
        }
    };
});
// vi.mock('@/lib/pricing/signature'); 

describe('Feature: Book workflow idempotency', () => {
    let saga: BookSaga;

    const baseRequest: BookRequest = {
        context: {
            domain: 'DISTRIBUTION',
            hotelId: 'HOTEL-123', // XOR with hubId
            requestId: 'REQ-3000'
        },
        idempotencyKey: 'IDEMP-BOOK-002',
        quote: {
            quoteId: 'Q-9001',
            pricingSignature: 'SIG-1'
        },
        stay: {
            checkIn: '2026-02-10',
            checkOut: '2026-02-13',
            adults: 2,
            children: 0,
            roomTypeCode: 'DLX',
            ratePlanCode: 'BAR'
        },
        guest: {
            primaryGuestName: 'Ana Silva',
            email: 'ana@example.com'
        }
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset default behaviors if needed, though they are fresh mocks each run implicitly if we used factory correctly?
        // Actually, the instances above are shared across tests, so clean them.
        mockIdempotencyServiceInstance.get.mockReset();
        mockIdempotencyServiceInstance.lock.mockReset();
        mockIdempotencyServiceInstance.complete.mockReset();
        mockIdempotencyServiceInstance.fail.mockReset();
        mockBookServiceInstance.createReservation.mockReset();
    });

    it('Scenario: Retry after timeout must not create a duplicate reservation', async () => {
        // Given an idempotencyKey "IDEMP-BOOK-002" (in request)
        // And the downstream PMS creates the reservation but the network times out
        // -> We simulate this by having idempotency service return a SUCCESS record 
        //    (meaning it actually finished) OR we simulate the retry logic.

        // Let's implement the scenario flow:
        // 1. First attempt (Simulation): 
        //    Saga would have run, created reservation, saved to idempotency, but maybe response failed to reach client.
        //    So Idempotency store has it as SUCCESS.

        const existingReservationId = 'RES-EXISTING-123';

        mockIdempotencyServiceInstance.get.mockResolvedValueOnce({
            key: 'IDEMP-BOOK-002',
            status: 'SUCCESS',
            result: { reservationId: existingReservationId },
            requestId: 'REQ-OLD-2999' // Different request ID from same client for same operation? Usually same key.
        });

        // When I execute the Book saga using quoteId "Q-9001" ...
        saga = new BookSaga(baseRequest);
        const result = await saga.execute();

        // Then the Book must succeed
        expect(result.success).toBe(true);

        // And the same "reservationId" must be returned
        expect(result.reservationId).toBe(existingReservationId);
        expect(result.state).toBe('CONFIRMED');

        // And no additional reservation must be created
        expect(mockBookServiceInstance.createReservation).not.toHaveBeenCalled();
        expect(mockIdempotencyServiceInstance.lock).not.toHaveBeenCalled(); // Should not lock again if found
    });

    it('Scenario: First successful booking', async () => {
        // Given no previous execution
        mockIdempotencyServiceInstance.get.mockResolvedValueOnce(null);

        const newReservationId = 'RES-NEW-001';
        mockBookServiceInstance.createReservation.mockResolvedValueOnce({
            reservationId: newReservationId,
            pnr: 'PNR-001',
            status: 'CONFIRMED',
            total: 300,
            currency: 'USD'
        });

        // When I execute
        saga = new BookSaga(baseRequest);
        const result = await saga.execute();

        // Then success
        expect(result.success).toBe(true);
        expect(result.reservationId).toBe(newReservationId);

        // Verify flow
        expect(mockIdempotencyServiceInstance.lock).toHaveBeenCalledWith(baseRequest.idempotencyKey, baseRequest.context.requestId);
        expect(mockBookServiceInstance.createReservation).toHaveBeenCalled();
        expect(mockIdempotencyServiceInstance.complete).toHaveBeenCalledWith(baseRequest.idempotencyKey, { reservationId: newReservationId });
    });
});
