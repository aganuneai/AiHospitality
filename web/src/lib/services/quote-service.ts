import { QuoteRequest, QuoteResult } from '@/lib/schemas/pricing/quote.schema';
import { v4 } from 'uuid';
import { differenceInCalendarDays, addDays, format, parseISO } from 'date-fns';
import { generatePricingSignature, type PricingComponents } from '../pricing/signature';
import { restrictionEngine } from '../restrictions/engine';
import { catalogRepository, CatalogRepository } from '@/lib/repositories/catalog/catalog.repository';
import { inventoryRepository, InventoryRepository } from '@/lib/repositories/inventory/inventory.repository';

export class QuoteService {
    constructor(
        private catalogRepo: CatalogRepository = catalogRepository,
        private inventoryRepo: InventoryRepository = inventoryRepository
    ) { }

    async generateQuotes(context: { hotelId: string }, request: QuoteRequest): Promise<QuoteResult[]> {
        const { hotelId } = context;
        const { stay } = request;

        // 1. Calculate stats
        const checkInDate = parseISO(stay.checkIn);
        const checkOutDate = parseISO(stay.checkOut);
        const nights = differenceInCalendarDays(checkOutDate, checkInDate);

        if (nights <= 0) throw new Error("INVALID_STAY_DURATION");

        // 2. Fetch Room Types (Catalog)
        const roomTypes = await this.catalogRepo.findRoomTypes(hotelId);
        const quotes: QuoteResult[] = [];

        for (const room of roomTypes) {
            // Filter by requested room type
            if (request.roomTypeCodes && !request.roomTypeCodes.includes(room.code)) continue;

            const ratePlanCode = request.ratePlanCode || 'BAR';

            // ✅ RESTRICTIONS CHECK
            const restrictionValidation = await restrictionEngine.validateQuote({
                propertyId: hotelId,
                roomTypeCode: room.code,
                ratePlanCode: ratePlanCode,
                checkIn: checkInDate,
                checkOut: checkOutDate
            });

            if (!restrictionValidation.valid) {
                console.warn(`Skipping ${room.code} due to restriction`, restrictionValidation.error);
                continue;
            }

            // --- AVAILABILITY CHECK ---
            // Fetch Inventory specifically for this room type
            const inventory = await this.inventoryRepo.findAvailability(hotelId, room.id, checkInDate, checkOutDate);

            // Must have inventory record for EVERY night
            if (inventory.length !== nights) continue; // Missing configuration for some nights

            // Check quantity > 0 for all nights
            const isAvailable = inventory.every(inv => inv.available >= 1);
            if (!isAvailable) continue;

            // --- PRICING CALCULATION ---
            let totalBase = 0;
            const breakdown = [];

            for (const nightInv of inventory) {
                // If price is missing in inventory, fallback to base logic (or error)
                // Assuming price is required in Inventory or RatePlan. 
                // For MVP, if nightInv.price is undefined, we use a default or skip.
                const nightlyPrice = Number(nightInv.price || 100); // Default fallback

                totalBase += nightlyPrice;
                breakdown.push({
                    date: format(nightInv.date, 'yyyy-MM-dd'),
                    base: nightlyPrice,
                    taxes: nightlyPrice * 0.1,
                    fees: 5.00,
                    total: nightlyPrice * 1.1 + 5.00
                });
            }

            const grandTotal = breakdown.reduce((acc, curr) => acc + curr.total, 0);
            const quoteId = v4();

            // Generate REAL pricing signature
            const pricingComponents: PricingComponents = {
                baseRate: totalBase,
                taxes: breakdown.map(b => ({ name: 'Tax', amount: b.taxes })),
                fees: breakdown.map(b => ({ name: 'Fee', amount: b.fees })),
                policies: {
                    cancellation: {
                        deadline: addDays(checkInDate, -1),
                        penalty: 0
                    },
                    guarantee: { required: false }
                },
                restrictions: [],
                ratePlanCode,
                roomTypeCode: room.code,
                dates: {
                    from: checkInDate,
                    to: checkOutDate
                }
            };

            const pricingSignature = generatePricingSignature(pricingComponents);

            quotes.push({
                quoteId,
                pricingSignature,
                roomTypeCode: room.code,
                ratePlanCode,
                currency: "USD",
                total: grandTotal,
                breakdown,
                policies: {
                    cancellation: {
                        type: 'FLEX',
                        penalty: 0
                    }
                },
                validUntil: addDays(new Date(), 1)
            });
        }

        return quotes;
    }
}

export const quoteService = new QuoteService();
