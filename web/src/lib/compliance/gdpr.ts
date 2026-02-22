/**
 * GDPR Compliance
 * 
 * Implements GDPR (General Data Protection Regulation) requirements:
 * - Right to access (data export)
 * - Right to erasure (data deletion)
 * - Consent management
 * - Data retention policies
 */

import { prisma } from '../db';
import { logger } from '../logger';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * GDPR data export
 * 
 * Export all personal data for a user (Right to access - Art. 15).
 * 
 * @param userId - User ID
 * @returns JSON with all user data
 */
export async function exportUserData(guestId: string): Promise<Record<string, any>> {
    logger.info('GDPR: Exporting user data', { guestId });

    try {
        // Fetch all guest-related data
        const guest = await prisma.guestProfile.findUnique({
            where: { id: guestId },
            include: {
                reservations: {
                    include: {
                        folio: true
                    }
                }
            }
        });

        if (!guest) {
            throw new Error(`Guest ${guestId} not found`);
        }

        // Aggregate all personal data
        const exportData = {
            metadata: {
                exportDate: new Date().toISOString(),
                guestId: guest.id,
                purpose: 'GDPR Article 15 - Right to Access'
            },
            personalData: {
                email: guest.email,
                name: guest.fullName,
                phone: guest.phone,
                document: guest.document,
                preferences: guest.preferences,
                createdAt: guest.createdAt,
                updatedAt: guest.updatedAt
            },
            reservations: guest.reservations?.map(r => ({
                pnr: r.pnr,
                checkIn: r.checkIn,
                checkOut: r.checkOut,
                status: r.status,
                total: r.total,
                createdAt: r.createdAt
            })) || []
        };

        // Log export
        await prisma.auditLog.create({
            data: {
                eventId: crypto.randomUUID(),
                eventType: 'GDPR_DATA_EXPORT',
                aggregateId: guestId,
                aggregateType: 'GuestProfile',
                payload: { guestId },
                hotelId: 'SYSTEM'
            }
        });

        return exportData;

    } catch (error: any) {
        logger.error('GDPR: Data export failed', {
            guestId,
            error: error.message
        });
        throw error;
    }
}

/**
 * GDPR data deletion
 * 
 * Delete or anonymize user data (Right to erasure - Art. 17).
 * 
 * @param userId - User ID
 * @param reason - Deletion reason
 * @param hardDelete - True for complete deletion, false for anonymization
 */
export async function deleteUserData(
    guestId: string,
    reason: string,
    hardDelete: boolean = false
): Promise<void> {
    logger.info('GDPR: Deleting user data', {
        guestId,
        reason,
        hardDelete
    });

    try {
        const guest = await prisma.guestProfile.findUnique({
            where: { id: guestId }
        });

        if (!guest) {
            throw new Error(`Guest ${guestId} not found`);
        }

        if (hardDelete) {
            // Hard delete: Remove all data permanently
            await prisma.$transaction(async (tx) => {
                // Delete guest profile
                await tx.guestProfile.delete({
                    where: { id: guest.id }
                });
            });

            logger.warn('GDPR: Guest data hard deleted', { guestId });

        } else {
            // Soft delete: Anonymize data
            await prisma.$transaction(async (tx) => {
                // Anonymize guest profile
                await tx.guestProfile.update({
                    where: { id: guest.id },
                    data: {
                        fullName: '[ANONYMIZED]',
                        email: `deleted_${guest.id}@anonymized.local`,
                        phone: null,
                        preferences: {},
                        document: {}
                    }
                });
            });

            logger.info('GDPR: Guest data anonymized', { guestId });
        }

        // Audit log
        await prisma.auditLog.create({
            data: {
                eventId: crypto.randomUUID(),
                eventType: 'GDPR_DATA_DELETION',
                aggregateId: guestId,
                aggregateType: 'GuestProfile',
                payload: {
                    guestId,
                    reason,
                    hardDelete
                },
                hotelId: 'SYSTEM'
            }
        });

    } catch (error: any) {
        logger.error('GDPR: Data deletion failed', {
            guestId,
            error: error.message
        });
        throw error;
    }
}

/**
 * Consent tracking
 * 
 * Track user consent for data processing (Art. 6, 7).
 */
export interface ConsentRecord {
    userId: string;
    consentType: 'MARKETING' | 'ANALYTICS' | 'THIRD_PARTY_SHARING';
    granted: boolean;
    timestamp: Date;
    ipAddress?: string;
    userAgent?: string;
}

/**
 * Record consent
 * 
 * @param consent - Consent record
 */
export async function recordConsent(consent: ConsentRecord): Promise<void> {
    throw new Error('ConsentLog model is not implemented in schema.prisma');
}

/**
 * Get user consent status
 * 
 * @param userId - User ID
 * @returns Current consent status
 */
export async function getUserConsent(userId: string): Promise<Record<string, boolean>> {
    throw new Error('ConsentLog model is not implemented in schema.prisma');
}

/**
 * Data retention policy
 * 
 * Delete old data per retention policies.
 */
export async function applyRetentionPolicy(): Promise<void> {
    logger.info('GDPR: Applying data retention policy');

    const retentionPeriods = {
        auditLogs: 365 * 7,      // 7 years (legal requirement)
        deletedUsers: 30,        // 30 days after deletion
        expiredQuotes: 90        // 90 days
    };

    try {
        // Delete old audit logs
        const auditCutoff = new Date();
        auditCutoff.setDate(auditCutoff.getDate() - retentionPeriods.auditLogs);

        const deletedAudits = await prisma.auditLog.deleteMany({
            where: {
                occurredAt: { lt: auditCutoff }
            }
        });

        logger.info('GDPR: Retention policy applied', {
            deletedAuditLogs: deletedAudits.count
        });

    } catch (error: any) {
        logger.error('GDPR: Retention policy failed', {
            error: error.message
        });
    }
}
