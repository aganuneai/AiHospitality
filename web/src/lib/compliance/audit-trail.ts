/**
 * Audit Trail
 * 
 * Tamper-proof audit logging for compliance.
 * Implements append-only logging with hash chains.
 */

import crypto from 'crypto';
import { prisma } from '../db';
import { logger } from '../logger';

/**
 * Audit event
 */
export interface AuditEvent {
    eventType: string;
    userId?: string;
    tenantId?: string;
    aggregateId: string;
    aggregateType: string;
    payload: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
}

/**
 * Append audit event
 * 
 * Creates tamper-proof audit log entry with hash chain.
 * 
 * @param event - Audit event
 */
export async function appendAuditEvent(event: AuditEvent): Promise<void> {
    try {
        // Get last audit entry to chain hashes
        const lastAudit = await prisma.auditLog.findFirst({
            orderBy: { occurredAt: 'desc' }
        });

        // Calculate hash of current event
        const eventData = JSON.stringify({
            eventType: event.eventType,
            userId: event.userId,
            tenantId: event.tenantId,
            aggregateId: event.aggregateId,
            aggregateType: event.aggregateType,
            payload: event.payload,
            timestamp: new Date().toISOString()
        });

        const previousHash = lastAudit?.metadata ? (lastAudit.metadata as any).hash : null;

        const currentHash = crypto
            .createHash('sha256')
            .update(eventData)
            .update(previousHash || '')  // Chain with previous hash
            .digest('hex');

        // Append to audit log
        await prisma.auditLog.create({
            data: {
                eventId: crypto.randomUUID(),
                eventType: event.eventType,
                userId: event.userId,
                aggregateId: event.aggregateId,
                aggregateType: event.aggregateType,
                payload: event.payload,
                hotelId: event.tenantId || 'SYSTEM',
                metadata: {
                    hash: currentHash,
                    previousHash: previousHash
                }
            }
        });

        logger.debug('Audit event appended', {
            eventType: event.eventType,
            hash: currentHash.substring(0, 16)
        });

    } catch (error: any) {
        logger.error('Failed to append audit event', {
            eventType: event.eventType,
            error: error.message
        });
        throw error;
    }
}

/**
 * Verify audit trail integrity
 * 
 * Checks if audit log has been tampered with by verifying hash chain.
 * 
 * @returns Verification result
 */
export async function verifyAuditIntegrity(): Promise<{
    valid: boolean;
    totalChecked: number;
    firstInvalid?: number;
    error?: string;
}> {
    try {
        const audits = await prisma.auditLog.findMany({
            orderBy: { occurredAt: 'asc' }
        });

        if (audits.length === 0) {
            return { valid: true, totalChecked: 0 };
        }

        for (let i = 0; i < audits.length; i++) {
            const audit = audits[i];
            const previousHash = i > 0 ? (audits[i - 1].metadata as any)?.hash : null;
            const currentHash = (audit.metadata as any)?.hash;
            const auditPrevHash = (audit.metadata as any)?.previousHash;

            // Recalculate hash
            const eventData = JSON.stringify({
                eventType: audit.eventType,
                userId: audit.userId,
                tenantId: audit.hotelId,
                aggregateId: audit.aggregateId,
                aggregateType: audit.aggregateType,
                payload: audit.payload as any,
                timestamp: audit.occurredAt.toISOString()
            });

            const expectedHash = crypto
                .createHash('sha256')
                .update(eventData)
                .update(previousHash || '')
                .digest('hex');

            // Verify hash matches
            if (currentHash !== expectedHash) {
                return {
                    valid: false,
                    totalChecked: i + 1,
                    firstInvalid: i,
                    error: `Hash mismatch at index ${i} (${audit.id})`
                };
            }

            // Verify chain link
            if (auditPrevHash !== previousHash) {
                return {
                    valid: false,
                    totalChecked: i + 1,
                    firstInvalid: i,
                    error: `Chain broken at index ${i} (${audit.id})`
                };
            }
        }

        logger.info('Audit trail integrity verified', {
            totalChecked: audits.length
        });

        return {
            valid: true,
            totalChecked: audits.length
        };

    } catch (error: any) {
        logger.error('Audit verification failed', {
            error: error.message
        });

        return {
            valid: false,
            totalChecked: 0,
            error: error.message
        };
    }
}

/**
 * Query audit trail
 * 
 * @param filters - Query filters
 * @returns Audit events
 */
export async function queryAuditTrail(filters: {
    eventType?: string;
    userId?: string;
    tenantId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
}) {
    const where: any = {};

    if (filters.eventType) {
        where.eventType = filters.eventType;
    }

    if (filters.userId) {
        where.userId = filters.userId;
    }

    if (filters.tenantId) {
        where.hotelId = filters.tenantId;
    }

    if (filters.startDate || filters.endDate) {
        where.occurredAt = {};
        if (filters.startDate) where.occurredAt.gte = filters.startDate;
        if (filters.endDate) where.occurredAt.lte = filters.endDate;
    }

    const audits = await prisma.auditLog.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        take: filters.limit || 100
    });

    return audits;
}

/**
 * Generate compliance report
 * 
 * @param type - Report type
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Report data
 */
export async function generateComplianceReport(
    type: 'GDPR' | 'PCI-DSS' | 'FULL',
    startDate: Date,
    endDate: Date
): Promise<{
    type: string;
    period: { start: Date; end: Date };
    summary: Record<string, number>;
    events: any[];
}> {
    const eventTypes: string[] = [];

    if (type === 'GDPR' || type === 'FULL') {
        eventTypes.push('GDPR_DATA_EXPORT', 'GDPR_DATA_DELETION', 'CONSENT_RECORDED');
    }

    if (type === 'PCI-DSS' || type === 'FULL') {
        eventTypes.push('PCI_PAYMENT_PROCESSED', 'PCI_PAYMENT_ACCESSED', 'PCI_CARD_TOKENIZED');
    }

    const events = await prisma.auditLog.findMany({
        where: {
            eventType: { in: eventTypes },
            occurredAt: {
                gte: startDate,
                lte: endDate
            }
        },
        orderBy: { occurredAt: 'desc' }
    });

    // Aggregate stats
    const summary: Record<string, number> = {};
    events.forEach(e => {
        summary[e.eventType] = (summary[e.eventType] || 0) + 1;
    });

    return {
        type,
        period: { start: startDate, end: endDate },
        summary,
        events
    };
}

/**
 * Archive old audit logs
 * 
 * Move logs older than retention period to cold storage.
 * 
 * @param retentionDays - Retention period in days
 */
export async function archiveOldLogs(retentionDays: number = 2555): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    logger.info('Archiving audit logs', {
        cutoffDate,
        retentionDays
    });

    // In production, export to S3/Azure Blob before deletion
    const toArchive = await prisma.auditLog.findMany({
        where: {
            occurredAt: { lt: cutoffDate }
        }
    });

    if (toArchive.length === 0) {
        logger.info('No logs to archive');
        return;
    }

    // TODO: Export to cold storage

    // For now, just log the count
    logger.info(`Would archive ${toArchive.length} audit logs`);
}
