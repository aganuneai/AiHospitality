import { prisma } from '@/lib/db';
import { IdempotencyService } from '@/lib/services/idempotency';
// import { QuoteService } from '@/lib/quote/quote-service'; // To be implemented/fixed if needed
import { BookService } from '@/lib/services/book-service';
import { validatePricingSignature } from '@/lib/pricing/signature';
import { BookRequest, BookRequestSchema } from '@/lib/schemas/booking/booking.schema';

// --- Saga States ---
export type BookState =
    | 'INIT'
    | 'CONTEXT_VALIDATED'
    | 'IDEMPOTENCY_CHECKED'
    | 'QUOTE_VALIDATED'
    | 'AVAILABILITY_RECHECKED'
    | 'RESERVATION_CREATED'
    | 'CONFIRMED'
    | 'FAILED';

export interface BookSagaResult {
    success: boolean;
    reservationId?: string;
    error?: {
        code: string;
        message: string;
    };
    state: BookState;
}

// --- Saga Implementation ---
export class BookSaga {
    private state: BookState = 'INIT';
    private request: BookRequest;
    private idempotencyService: IdempotencyService;
    private bookService: BookService;

    constructor(request: BookRequest) {
        this.request = BookRequestSchema.parse(request); // Validate input immediately
        this.idempotencyService = new IdempotencyService();
        this.bookService = new BookService();
    }

    async execute(): Promise<BookSagaResult> {
        try {
            // 1. INIT -> CONTEXT_VALIDATED
            this.validateContext();
            this.state = 'CONTEXT_VALIDATED';

            // 2. CONTEXT_VALIDATED -> IDEMPOTENCY_CHECKED
            // Lock idempotency key first to prevent race conditions
            // If lock fails, it means another request is processing or finished

            const existingRecord = await this.idempotencyService.get(this.request.idempotencyKey);

            if (existingRecord) {
                if (existingRecord.status === 'SUCCESS') {
                    const result = existingRecord.result as { reservationId: string };
                    return {
                        success: true,
                        reservationId: result.reservationId,
                        state: 'CONFIRMED'
                    };
                } else if (existingRecord.status === 'PENDING') {
                    // In a real system we might wait or throw "InProgress"
                    throw new Error("Request already in progress");
                } else {
                    // Failed previously
                    throw new Error("Previous request failed");
                }
            }

            // Lock it
            await this.idempotencyService.lock(this.request.idempotencyKey, this.request.context.requestId);
            this.state = 'IDEMPOTENCY_CHECKED';

            // 3. IDEMPOTENCY_CHECKED -> QUOTE_VALIDATED
            await this.validateQuote();
            this.state = 'QUOTE_VALIDATED';

            // 4. QUOTE_VALIDATED -> AVAILABILITY_RECHECKED
            // availability check is implicitly done in createReservation/BookService for now
            // but explicitly calling it here would be better for Saga definition.
            // Skipping distinct step to avoid double-querying in this MVP.
            this.state = 'AVAILABILITY_RECHECKED';

            // 5. AVAILABILITY_RECHECKED -> RESERVATION_CREATED
            const reservation = await this.createReservation();
            this.state = 'RESERVATION_CREATED';

            // 6. RESERVATION_CREATED -> CONFIRMED
            await this.confirmAndPersistIdempotency(reservation.reservationId);
            this.state = 'CONFIRMED';

            return {
                success: true,
                reservationId: reservation.reservationId,
                state: this.state
            };

        } catch (error: any) {
            console.error("BookSaga Failed", error);
            this.state = 'FAILED';

            // Attempt to record failure in idempotency log
            try {
                await this.idempotencyService.fail(this.request.idempotencyKey, { message: error.message });
            } catch (e) { /* ignore cleanup error */ }

            return {
                success: false,
                state: this.state,
                error: {
                    code: error.code || 'UNKNOWN_ERROR',
                    message: error.message || 'An unexpected error occurred'
                }
            };
        }
    }

    private validateContext() {
        // Basic validation passed via Zod
        // Check if hotelId is provided (since we don't handle hubId yet)
        if (!this.request.context.hotelId) {
            throw new Error("Only property-level (hotelId) supported in MVP");
        }
    }

    private async validateQuote() {
        // We don't have the original Quote object here to pass to validatePricingSignature directly
        // In a real app we would load the Quote from DB using quoteId.
        // For this MVP, we will trust the logic inside BookService or assume the client sent valid data if verify logic is downstream.
        // However, BookService has `validatePricingSignature` logic inside `createReservation`.
        // So we can defer, or we mock the check here.

        // Let's assume validation happens in `createReservation` to avoid fetching data twice.
    }

    private async createReservation() {
        // Map Saga request to BookService Request
        const hotelId = this.request.context.hotelId!;
        const context = { propertyId: hotelId, channelId: 'DIRECT' };

        // Pass the canonical request directly to the service
        const result = await this.bookService.createBooking(context, this.request);
        return { reservationId: result.reservationId };
    }

    private async confirmAndPersistIdempotency(reservationId: string) {
        await this.idempotencyService.complete(this.request.idempotencyKey, { reservationId });
    }
}
