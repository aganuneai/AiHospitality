import { prisma } from '@/lib/db';

export interface AuditEvent {
    eventType: string;
    aggregateId: string;
    aggregateType: string;
    payload: any;
    metadata?: any;
    requestId?: string;
    userId?: string;
    hotelId: string;
}

export interface AuditLogFilter {
    aggregateId?: string;
    aggregateType?: string;
    eventType?: string;
    hotelId?: string;
    from?: Date;
    to?: Date;
    limit?: number;
}

export class AuditLogService {
    /**
     * Log an event to the audit trail
     */
    async log(event: AuditEvent): Promise<void> {
        const eventId = `${event.eventType}-${event.aggregateId}-${Date.now()}`;

        try {
            await prisma.auditLog.create({
                data: {
                    eventId,
                    eventType: event.eventType,
                    aggregateId: event.aggregateId,
                    aggregateType: event.aggregateType,
                    payload: event.payload,
                    metadata: event.metadata || {},
                    requestId: event.requestId,
                    userId: event.userId,
                    hotelId: event.hotelId,
                    occurredAt: new Date()
                }
            });
        } catch (error) {
            // Don't fail the request if audit logging fails
            console.error('[AuditLog] Failed to log event:', error);
        }
    }

    /**
     * Get audit events with filters
     */
    async getEvents(filter: AuditLogFilter) {
        const where: any = {};

        if (filter.aggregateId) where.aggregateId = filter.aggregateId;
        if (filter.aggregateType) where.aggregateType = filter.aggregateType;
        if (filter.eventType) where.eventType = filter.eventType;
        if (filter.hotelId) where.hotelId = filter.hotelId;

        if (filter.from || filter.to) {
            where.occurredAt = {};
            if (filter.from) where.occurredAt.gte = filter.from;
            if (filter.to) where.occurredAt.lte = filter.to;
        }

        return prisma.auditLog.findMany({
            where,
            orderBy: { occurredAt: 'desc' },
            take: filter.limit || 100
        });
    }

    /**
     * Get event stream for an aggregate (e.g., all events for a reservation)
     */
    async getAggregateHistory(aggregateId: string, aggregateType: string) {
        return prisma.auditLog.findMany({
            where: {
                aggregateId,
                aggregateType
            },
            orderBy: { occurredAt: 'asc' }
        });
    }

    /**
     * Check if event already exists (deduplication)
     */
    async eventExists(eventId: string): Promise<boolean> {
        const existing = await prisma.auditLog.findUnique({
            where: { eventId },
            select: { id: true }
        });
        return !!existing;
    }
}

export const auditLogService = new AuditLogService();
