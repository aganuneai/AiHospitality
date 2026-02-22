/**
 * Backup Service
 * 
 * Automated database and file backups with retention policies.
 * Supports daily, weekly, and monthly backup schedules.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../logger';

const execAsync = promisify(exec);

/**
 * Backup types
 */
export enum BackupType {
    DAILY = 'DAILY',
    WEEKLY = 'WEEKLY',
    MONTHLY = 'MONTHLY'
}

/**
 * Backup metadata
 */
export interface BackupMetadata {
    id: string;
    type: BackupType;
    timestamp: Date;
    size: number;
    duration: number;
    status: 'SUCCESS' | 'FAILED';
    error?: string;
    filename: string;
    checksum: string;
}

/**
 * Backup retention policies
 */
const RETENTION_POLICIES = {
    [BackupType.DAILY]: 7,      // Keep 7 daily backups
    [BackupType.WEEKLY]: 4,     // Keep 4 weekly backups
    [BackupType.MONTHLY]: 12    // Keep 12 monthly backups
};

/**
 * Backup configuration
 */
interface BackupConfig {
    backupDir: string;
    dbHost: string;
    dbPort: number;
    dbName: string;
    dbUser: string;
    dbPassword: string;
}

const config: BackupConfig = {
    backupDir: process.env.BACKUP_DIR || './backups',
    dbHost: process.env.DB_HOST || 'localhost',
    dbPort: parseInt(process.env.DB_PORT || '5432'),
    dbName: process.env.DB_NAME || 'aihospitality',
    dbUser: process.env.DB_USER || 'postgres',
    dbPassword: process.env.DB_PASSWORD || ''
};

/**
 * Create database backup using pg_dump
 * 
 * @param type - Backup type
 * @returns Backup metadata
 */
export async function createDatabaseBackup(type: BackupType): Promise<BackupMetadata> {
    const startTime = Date.now();
    const timestamp = new Date();
    const filename = `db_${type.toLowerCase()}_${timestamp.toISOString().replace(/[:.]/g, '-')}.sql.gz`;
    const filepath = path.join(config.backupDir, filename);

    logger.info('Starting database backup', {
        type,
        filename
    });

    try {
        // Ensure backup directory exists
        await fs.mkdir(config.backupDir, { recursive: true });

        // Create pg_dump command with compression
        const dumpCommand = `PGPASSWORD="${config.dbPassword}" pg_dump -h ${config.dbHost} -p ${config.dbPort} -U ${config.dbUser} -d ${config.dbName} --format=custom --compress=9 --file="${filepath}"`;

        // Execute backup
        await execAsync(dumpCommand);

        // Get file size
        const stats = await fs.stat(filepath);

        // Calculate checksum (SHA-256)
        const checksumCommand = `sha256sum "${filepath}"`;
        const { stdout } = await execAsync(checksumCommand);
        const checksum = stdout.split(' ')[0];

        const duration = Date.now() - startTime;

        const metadata: BackupMetadata = {
            id: `backup_${Date.now()}`,
            type,
            timestamp,
            size: stats.size,
            duration,
            status: 'SUCCESS',
            filename,
            checksum
        };

        // Save metadata
        await saveBackupMetadata(metadata);

        logger.info('Database backup completed', {
            type,
            filename,
            size: stats.size,
            duration
        });

        return metadata;

    } catch (error: any) {
        const duration = Date.now() - startTime;

        const metadata: BackupMetadata = {
            id: `backup_${Date.now()}`,
            type,
            timestamp,
            size: 0,
            duration,
            status: 'FAILED',
            error: error.message,
            filename,
            checksum: ''
        };

        await saveBackupMetadata(metadata);

        logger.error('Database backup failed', {
            type,
            error: error.message,
            duration
        });

        throw error;
    }
}

/**
 * Save backup metadata to JSON file
 * 
 * @param metadata - Backup metadata
 */
async function saveBackupMetadata(metadata: BackupMetadata): Promise<void> {
    const metadataFile = path.join(config.backupDir, `${metadata.id}.json`);
    await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2));
}

/**
 * List all backups
 * 
 * @param type - Optional backup type filter
 * @returns Array of backup metadata
 */
export async function listBackups(type?: BackupType): Promise<BackupMetadata[]> {
    try {
        const files = await fs.readdir(config.backupDir);
        const metadataFiles = files.filter(f => f.endsWith('.json'));

        const backups: BackupMetadata[] = [];

        for (const file of metadataFiles) {
            const content = await fs.readFile(path.join(config.backupDir, file), 'utf-8');
            const metadata: BackupMetadata = JSON.parse(content);

            if (!type || metadata.type === type) {
                backups.push(metadata);
            }
        }

        // Sort by timestamp (newest first)
        return backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    } catch (error: any) {
        logger.error('Failed to list backups', { error: error.message });
        return [];
    }
}

/**
 * Apply retention policy
 * 
 * Deletes old backups based on retention policy.
 * 
 * @param type - Backup type
 */
export async function applyRetentionPolicy(type: BackupType): Promise<void> {
    const backups = await listBackups(type);
    const retentionCount = RETENTION_POLICIES[type];

    if (backups.length <= retentionCount) {
        logger.debug('Retention policy: no backups to delete', {
            type,
            count: backups.length,
            retention: retentionCount
        });
        return;
    }

    // Delete old backups (beyond retention count)
    const toDelete = backups.slice(retentionCount);

    for (const backup of toDelete) {
        try {
            const filepath = path.join(config.backupDir, backup.filename);
            const metadataFile = path.join(config.backupDir, `${backup.id}.json`);

            await fs.unlink(filepath);
            await fs.unlink(metadataFile);

            logger.info('Deleted old backup', {
                id: backup.id,
                filename: backup.filename,
                age: Math.floor((Date.now() - backup.timestamp.getTime()) / (1000 * 60 * 60 * 24)) + ' days'
            });

        } catch (error: any) {
            logger.warn('Failed to delete backup', {
                id: backup.id,
                error: error.message
            });
        }
    }

    logger.info('Retention policy applied', {
        type,
        deleted: toDelete.length,
        remaining: backups.length - toDelete.length
    });
}

/**
 * Scheduled backup job
 * 
 * Run this daily via cron/scheduler.
 */
export async function scheduledBackup(): Promise<void> {
    const now = new Date();
    const dayOfMonth = now.getDate();
    const dayOfWeek = now.getDay();

    try {
        // Monthly backup (1st of month)
        if (dayOfMonth === 1) {
            await createDatabaseBackup(BackupType.MONTHLY);
            await applyRetentionPolicy(BackupType.MONTHLY);
        }

        // Weekly backup (Sunday)
        if (dayOfWeek === 0) {
            await createDatabaseBackup(BackupType.WEEKLY);
            await applyRetentionPolicy(BackupType.WEEKLY);
        }

        // Daily backup (every day)
        await createDatabaseBackup(BackupType.DAILY);
        await applyRetentionPolicy(BackupType.DAILY);

        logger.info('Scheduled backup completed successfully');

    } catch (error: any) {
        logger.error('Scheduled backup failed', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}
