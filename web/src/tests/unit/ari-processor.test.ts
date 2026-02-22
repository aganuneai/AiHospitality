
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AriProcessorService } from '@/lib/services/ari-processor.service';
import { prisma } from '@/lib/db';
import { AriProcessorInput } from '@/lib/services/ari-processor.service';

// Mock Prisma
vi.mock('@/lib/db', () => ({
    prisma: {
        ariEvent: {
            findUnique: vi.fn(),
            create: vi.fn()
        },
        roomType: {
            findUnique: vi.fn()
        },
        inventory: {
            upsert: vi.fn()
        }
    }
}));

// Mock Audit Log
vi.mock('@/lib/services/audit-log.service', () => ({
    auditLogService: {
        log: vi.fn()
    }
}));

describe('AriProcessorService: Inventory Logic', () => {
    let service: AriProcessorService;

    beforeEach(() => {
        service = new AriProcessorService();
        vi.clearAllMocks();

        // Default mocks
        (prisma.ariEvent.findUnique as any).mockResolvedValue(null); // Not duplicate
        (prisma.roomType.findUnique as any).mockResolvedValue({ id: 'RT-1', code: 'DLX' }); // Room exists
    });

    const baseEvent: AriProcessorInput = {
        eventType: 'AVAILABILITY',
        propertyId: 'HOTEL-1',
        roomTypeCode: 'DLX',
        dateRange: { from: '2026-01-01', to: '2026-01-01' },
        payload: {
            availability: 5,
            updateType: 'SET'
        }
    };

    it('should handle SET availability', async () => {
        const event = { ...baseEvent, payload: { availability: 5, updateType: 'SET' } };

        await service.processEvent(event as any);

        expect(prisma.inventory.upsert).toHaveBeenCalledWith(expect.objectContaining({
            create: expect.objectContaining({ available: 5 }),
            update: expect.objectContaining({ available: 5 })
        }));
    });

    it('should handle INCREMENT availability', async () => {
        const event = { ...baseEvent, payload: { availability: 3, updateType: 'INCREMENT' } };

        await service.processEvent(event as any);

        expect(prisma.inventory.upsert).toHaveBeenCalledWith(expect.objectContaining({
            create: expect.objectContaining({ available: 3 }),
            update: expect.objectContaining({
                available: { increment: 3 },
                total: { increment: 3 }
            })
        }));
    });

    it('should handle DECREMENT availability', async () => {
        const event = { ...baseEvent, payload: { availability: 2, updateType: 'DECREMENT' } };

        await service.processEvent(event as any);

        expect(prisma.inventory.upsert).toHaveBeenCalledWith(expect.objectContaining({
            create: expect.objectContaining({ available: 0 }), // Create default 0
            update: expect.objectContaining({
                available: { decrement: 2 },
                total: { decrement: 2 }
            })
        }));
    });
});
