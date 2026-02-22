import { auditLogService } from './audit-log.service';
import { AriEvent } from '@/lib/contracts/ari.schema';
import { AriEventStatus } from '@/lib/types/ari';
import { parseISO, eachDayOfInterval } from 'date-fns';
import { Decimal } from '@prisma/client/runtime/library';
import { inventoryRepository, InventoryRepository } from '@/lib/repositories/inventory/inventory.repository';
import { catalogRepository, CatalogRepository } from '@/lib/repositories/catalog/catalog.repository';
import { prisma } from '@/lib/db'; // Keeping prisma ONLY for AriEvent log currently, until we make an EventRepository

// Enhance AriEvent with contextual fields that might come from headers/DB but aren't in the raw payload if it's just the body?
// Actually AriEvent from schema has everything needed except maybe 'channelCode' if it's header-only?
// Schema has roomTypeCode, dateRange, etc.
// Let's assume the input to service is fully hydrated AriEvent + propertyId + channelCode.

export type AriProcessorInput = AriEvent & {
    propertyId: string;
    channelCode?: string;
};

export interface ProcessingResult {
    success: boolean;
    status: AriEventStatus;
    message: string;
    eventId?: string;
}

/**
 * ARI Processor Service
 * Implements the ARI Apply Saga: RECEIVED → DEDUPED → VALIDATED → NORMALIZED → APPLIED → ACKED
 */
export class AriProcessorService {
    constructor(
        private inventoryRepo: InventoryRepository = inventoryRepository,
        private catalogRepo: CatalogRepository = catalogRepository
    ) { }

    /**
     * Main entry point for processing ARI events
     */
    async processEvent(event: AriProcessorInput): Promise<ProcessingResult> {
        const eventId = event.eventId || this.generateEventId(event);
        const occurredAt = event.occurredAt ? parseISO(event.occurredAt) : new Date();

        try {
            // STATE 1: RECEIVED → DEDUPED
            const isDuplicate = await this.isDuplicate(eventId);
            if (isDuplicate) {
                await this.logAudit('ARI_EVENT_DEDUPED', event.propertyId, { eventId, eventType: event.eventType });
                return { success: false, status: 'DEDUPED', message: 'Event already processed (duplicate)', eventId };
            }

            // STATE 2: DEDUPED → VALIDATED
            const validationError = await this.validate(event);
            if (validationError) {
                await this.sendToDLQ(event, validationError);
                return { success: false, status: 'ERROR', message: validationError, eventId };
            }

            // STATE 3: VALIDATED → NORMALIZED
            const normalized = await this.normalize(event);

            // STATE 4: NORMALIZED → APPLIED
            await this.apply(normalized);

            // STATE 5: APPLIED → ACKED
            await this.saveEvent(eventId, event, occurredAt, 'APPLIED');
            await this.logAudit('ARI_EVENT_APPLIED', event.propertyId, {
                eventId,
                eventType: event.eventType,
                roomTypeCode: event.roomTypeCode,
                dateRange: event.dateRange
            });

            return { success: true, status: 'APPLIED', message: 'Event processed successfully', eventId };

        } catch (error) {
            console.error('[AriProcessor] Processing failed:', error);
            await this.sendToDLQ(event, (error as Error).message);
            return { success: false, status: 'ERROR', message: (error as Error).message, eventId };
        }
    }

    /**
     * Check if event already processed (deduplication)
     */
    private async isDuplicate(eventId: string): Promise<boolean> {
        // TODO: Move to EventRepository
        const existing = await prisma.ariEvent.findUnique({ where: { eventId } });
        return !!existing;
    }

    /**
     * Validate event payload
     */
    private async validate(event: AriProcessorInput): Promise<string | null> {
        // Check room type exists in the property context
        const roomType = await this.catalogRepo.findRoomType(event.propertyId, event.roomTypeCode);
        if (!roomType) return `Room type ${event.roomTypeCode} not found`;

        // Date range logical validation
        try {
            const from = parseISO(event.dateRange.from);
            const to = parseISO(event.dateRange.to);
            if (from > to) return 'Invalid date range: from > to';
        } catch (e) {
            return 'Invalid date format';
        }

        // Zod already guaranteed structure, so we are good on payload shape.
        return null; // Valid
    }

    /**
     * Normalize event data
     */
    private async normalize(event: AriProcessorInput): Promise<AriProcessorInput> {
        // Normalization could include:
        // - Converting date formats
        // - Resolving rate plan codes
        // - Applying business rules
        return event; // For now, pass-through
    }

    /**
     * Apply the event to inventory/rates/restrictions
     */
    private async apply(event: AriProcessorInput): Promise<void> {
        const roomType = await this.catalogRepo.findRoomType(event.propertyId, event.roomTypeCode);
        if (!roomType) throw new Error('Room type not found during apply');

        const fromDate = parseISO(event.dateRange.from);
        const toDate = parseISO(event.dateRange.to);
        const dates = eachDayOfInterval({ start: fromDate, end: toDate });

        switch (event.eventType) {
            case 'AVAILABILITY':
                // Check if InventoryRepository has bulk update?
                // For now, implementing logic here calling repo or raw prisma if Repo misses capability.
                // NOTE: Using RAW PRISMA here temporarily because InventoryRepository needs expansion to support Upserts/Bulk updates
                // Or better: Expand InventoryRepository NOW.
                // Let's call a new method on Repo.
                if (event.eventType === 'AVAILABILITY') {
                    // Requires casting because input is union
                    await this.applyAvailability(event as any, roomType.id, dates);
                }
                break;
            case 'RATE':
                if (event.eventType === 'RATE') {
                    await this.applyRate(event as any, roomType.id, dates);
                }
                break;
            case 'RESTRICTION':
                if (event.eventType === 'RESTRICTION') {
                    await this.applyRestriction(event as any, roomType.id, dates);
                }
                break;
        }
    }

    private async applyAvailability(
        event: AriProcessorInput & { eventType: 'AVAILABILITY', payload: { availability: number, updateType?: 'SET' | 'INCREMENT' | 'DECREMENT' } },
        roomTypeId: string,
        dates: Date[]
    ): Promise<void> {
        const value = event.payload.availability;
        const updateType = event.payload.updateType || 'SET';

        for (const date of dates) {
            await this.inventoryRepo.upsertAvailability(event.propertyId, roomTypeId, date, value, updateType);
        }
    }

    private async applyRate(
        event: AriProcessorInput & { eventType: 'RATE', payload: { rates?: { date: string, price: number }[], baseRate?: number } },
        roomTypeId: string,
        dates: Date[]
    ): Promise<void> {
        // Handle Base Rate (apply to all dates in range)
        if (event.payload.baseRate) {
            const price = Number(event.payload.baseRate);
            for (const date of dates) {
                await this.inventoryRepo.upsertPrice(event.propertyId, roomTypeId, date, price);
            }
        }

        // Handle Specific Rates (override or set for specific dates)
        if (event.payload.rates) {
            for (const rateItem of event.payload.rates) {
                const date = parseISO(rateItem.date);
                const price = Number(rateItem.price);
                await this.inventoryRepo.upsertPrice(event.propertyId, roomTypeId, date, price);
            }
        }
    }

    private async applyRestriction(
        event: AriProcessorInput & { eventType: 'RESTRICTION', payload: { restrictions?: any } },
        roomTypeId: string,
        dates: Date[]
    ): Promise<void> {
        const restrictions = event.payload.restrictions || {};

        for (const date of dates) {
            await this.inventoryRepo.upsertRestriction(event.propertyId, roomTypeId, date, restrictions);
        }
    }

    /**
     * Save event to database
     */
    private async saveEvent(
        eventId: string,
        event: AriProcessorInput,
        occurredAt: Date,
        status: AriEventStatus
    ): Promise<void> {
        await prisma.ariEvent.create({
            data: {
                eventId, occurredAt, propertyId: event.propertyId, channelCode: event.channelCode,
                eventType: event.eventType, roomTypeCode: event.roomTypeCode, ratePlanCode: event.ratePlanCode,
                dateRange: event.dateRange, payload: event.payload as any, status,
                processedAt: status === 'APPLIED' ? new Date() : null
            }
        });
    }

    /**
     * Send failed event to Dead Letter Queue
     */
    private async sendToDLQ(event: AriProcessorInput, error: string): Promise<void> {
        const eventId = event.eventId || this.generateEventId(event);
        await prisma.ariEvent.create({
            data: {
                eventId, occurredAt: event.occurredAt ? parseISO(event.occurredAt) : new Date(),
                propertyId: event.propertyId, channelCode: event.channelCode, eventType: event.eventType,
                roomTypeCode: event.roomTypeCode, ratePlanCode: event.ratePlanCode, dateRange: event.dateRange,
                payload: { ...event.payload, error } as any, status: 'ERROR', processedAt: new Date()
            }
        });
        console.error('[AriProcessor] Event sent to DLQ:', { eventId, error });
    }

    /**
     * Generate unique event ID
     */
    private generateEventId(event: AriProcessorInput): string {
        return `ari_${event.eventType.toLowerCase()}_${event.roomTypeCode}_${Date.now()}`;
    }

    /**
     * Log to audit trail
     */
    private async logAudit(eventType: string, hotelId: string, payload: any): Promise<void> {
        await auditLogService.log({ eventType, aggregateId: payload.eventId || 'unknown', aggregateType: 'AriEvent', payload, hotelId });
    }
}

export const ariProcessorService = new AriProcessorService();
