/**
 * Backup Monitor
 * 
 * Health checks and monitoring for backup system.
 * Alerts on backup failures and tracks RPO/RTO metrics.
 */

import { listBackups, BackupType } from './backup-service';
import { estimateRTO } from './restore-service';
import { logger } from '../logger';

/**
 * Backup health status
 */
export interface BackupHealth {
    healthy: boolean;
    lastBackup?: {
        type: BackupType;
        timestamp: Date;
        hoursAgo: number;
    };
    issues: string[];
    metrics: {
        totalBackups: number;
        failedBackups: number;
        successRate: number;
        avgBackupSize: number;
        avgBackupDuration: number;
        estimatedRTO: number;     // seconds
        estimatedRPO: number;     // seconds
    };
}

/**
 * RPO (Recovery Point Objective) target
 * Maximum acceptable data loss in seconds
 */
const RPO_TARGET = 3600; // 1 hour

/**
 * RTO (Recovery Time Objective) target
 * Maximum acceptable downtime in seconds
 */
const RTO_TARGET = 14400; // 4 hours

/**
 * Check backup health
 * 
 * @returns Health status and metrics
 */
export async function checkBackupHealth(): Promise<BackupHealth> {
    const issues: string[] = [];
    const backups = await listBackups();

    if (backups.length === 0) {
        issues.push('No backups found');
        return {
            healthy: false,
            issues,
            metrics: {
                totalBackups: 0,
                failedBackups: 0,
                successRate: 0,
                avgBackupSize: 0,
                avgBackupDuration: 0,
                estimatedRTO: RTO_TARGET,
                estimatedRPO: RPO_TARGET
            }
        };
    }

    // Get most recent successful backup
    const lastSuccessfulBackup = backups.find(b => b.status === 'SUCCESS');

    if (!lastSuccessfulBackup) {
        issues.push('No successful backups found');
    } else {
        const hoursAgo = (Date.now() - lastSuccessfulBackup.timestamp.getTime()) / (1000 * 60 * 60);

        // Check if last backup is too old (> 25 hours = missed daily backup)
        if (hoursAgo > 25) {
            issues.push(`Last backup is ${Math.floor(hoursAgo)} hours old (expected < 25 hours)`);
        }
    }

    // Calculate metrics
    const successfulBackups = backups.filter(b => b.status === 'SUCCESS');
    const failedBackups = backups.filter(b => b.status === 'FAILED');

    const totalBackups = backups.length;
    const successRate = totalBackups > 0 ? (successfulBackups.length / totalBackups) * 100 : 0;

    const avgBackupSize = successfulBackups.length > 0
        ? successfulBackups.reduce((sum, b) => sum + b.size, 0) / successfulBackups.length
        : 0;

    const avgBackupDuration = successfulBackups.length > 0
        ? successfulBackups.reduce((sum, b) => sum + b.duration, 0) / successfulBackups.length
        : 0;

    const estimatedRTO = await estimateRTO();

    // Calculate RPO (time since last successful backup)
    const estimatedRPO = lastSuccessfulBackup
        ? Math.floor((Date.now() - lastSuccessfulBackup.timestamp.getTime()) / 1000)
        : RPO_TARGET;

    // Check RTO/RPO targets
    if (estimatedRTO > RTO_TARGET) {
        issues.push(`Estimated RTO (${Math.floor(estimatedRTO / 3600)}h) exceeds target (${RTO_TARGET / 3600}h)`);
    }

    if (estimatedRPO > RPO_TARGET) {
        issues.push(`Current RPO (${Math.floor(estimatedRPO / 3600)}h) exceeds target (${RPO_TARGET / 3600}h)`);
    }

    // Check failure rate
    if (successRate < 95) {
        issues.push(`Backup success rate (${successRate.toFixed(1)}%) is below 95%`);
    }

    return {
        healthy: issues.length === 0,
        lastBackup: lastSuccessfulBackup ? {
            type: lastSuccessfulBackup.type,
            timestamp: lastSuccessfulBackup.timestamp,
            hoursAgo: (Date.now() - lastSuccessfulBackup.timestamp.getTime()) / (1000 * 60 * 60)
        } : undefined,
        issues,
        metrics: {
            totalBackups,
            failedBackups: failedBackups.length,
            successRate,
            avgBackupSize,
            avgBackupDuration,
            estimatedRTO,
            estimatedRPO
        }
    };
}

/**
 * Alert on backup issues
 * 
 * Should be called periodically (e.g., every hour).
 * 
 * @returns True if alerts were sent
 */
export async function alertOnIssues(): Promise<boolean> {
    const health = await checkBackupHealth();

    if (!health.healthy) {
        logger.error('Backup health check FAILED', {
            issues: health.issues,
            metrics: health.metrics
        });

        // In production, send alerts via:
        // - Email
        // - Slack
        // - PagerDuty
        // - SMS

        // For now, just log
        console.error('🚨 BACKUP ALERT:', health.issues.join('; '));

        return true;
    }

    logger.info('Backup health check OK', {
        lastBackup: health.lastBackup,
        metrics: health.metrics
    });

    return false;
}

/**
 * Verify backup integrity
 * 
 * Checks if a random sample of backups are valid.
 * 
 * @param sampleSize - Number of backups to verify
 * @returns Verification result
 */
export async function verifyBackupIntegrity(sampleSize: number = 3): Promise<{
    verified: number;
    failed: number;
    errors: Array<{ backupId: string; error: string }>;
}> {
    const backups = await listBackups();
    const successfulBackups = backups.filter(b => b.status === 'SUCCESS');

    if (successfulBackups.length === 0) {
        return { verified: 0, failed: 0, errors: [] };
    }

    // Sample random backups
    const sample = successfulBackups
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(sampleSize, successfulBackups.length));

    let verified = 0;
    let failed = 0;
    const errors: Array<{ backupId: string; error: string }> = [];

    for (const backup of sample) {
        try {
            const backupDir = process.env.BACKUP_DIR || './backups';
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);
            const path = require('path');

            const filepath = path.join(backupDir, backup.filename);

            // Verify checksum
            const checksumCommand = `sha256sum "${filepath}"`;
            const { stdout } = await execAsync(checksumCommand);
            const checksum = stdout.split(' ')[0];

            if (checksum !== backup.checksum) {
                failed++;
                errors.push({
                    backupId: backup.id,
                    error: 'Checksum mismatch'
                });
            } else {
                verified++;
            }

        } catch (error: any) {
            failed++;
            errors.push({
                backupId: backup.id,
                error: error.message
            });
        }
    }

    logger.info('Backup integrity verification completed', {
        verified,
        failed,
        total: sample.length
    });

    if (failed > 0) {
        logger.warn('Backup integrity issues detected', { errors });
    }

    return { verified, failed, errors };
}

/**
 * Get backup statistics
 * 
 * @returns Backup statistics
 */
export async function getBackupStatistics() {
    const backups = await listBackups();
    const health = await checkBackupHealth();

    return {
        total: backups.length,
        byType: {
            daily: backups.filter(b => b.type === BackupType.DAILY).length,
            weekly: backups.filter(b => b.type === BackupType.WEEKLY).length,
            monthly: backups.filter(b => b.type === BackupType.MONTHLY).length
        },
        byStatus: {
            success: backups.filter(b => b.status === 'SUCCESS').length,
            failed: backups.filter(b => b.status === 'FAILED').length
        },
        health
    };
}
