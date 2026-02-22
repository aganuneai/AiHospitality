/**
 * Restore Service
 * 
 * Point-in-time database restore with validation and dry-run support.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../logger';
import { BackupMetadata, listBackups, BackupType } from './backup-service';

const execAsync = promisify(exec);

/**
 * Restore options
 */
export interface RestoreOptions {
    backupId?: string;         // Specific backup ID
    timestamp?: Date;          // Point-in-time (finds closest backup)
    dryRun?: boolean;          // Validate only, don't restore
    targetDb?: string;         // Restore to different DB (for testing)
}

/**
 * Restore result
 */
export interface RestoreResult {
    success: boolean;
    backupUsed: BackupMetadata;
    duration: number;
    dryRun: boolean;
    validation: {
        checksumValid: boolean;
        backupExists: boolean;
        databaseConnectable: boolean;
    };
    error?: string;
}

/**
 * Database configuration
 */
interface DbConfig {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
}

const config: DbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'aihospitality',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || ''
};

/**
 * Find backup by ID or timestamp
 * 
 * @param options - Restore options
 * @returns Backup metadata or null
 */
async function findBackup(options: RestoreOptions): Promise<BackupMetadata | null> {
    const backups = await listBackups();

    if (options.backupId) {
        // Find by specific ID
        return backups.find(b => b.id === options.backupId) || null;
    }

    if (options.timestamp) {
        // Find closest backup before timestamp
        const validBackups = backups.filter(b =>
            b.timestamp <= options.timestamp! && b.status === 'SUCCESS'
        );

        if (validBackups.length === 0) return null;

        // Return most recent backup before timestamp
        return validBackups[0];
    }

    // Default: most recent successful backup
    return backups.find(b => b.status === 'SUCCESS') || null;
}

/**
 * Validate backup before restore
 * 
 * @param backup - Backup metadata
 * @param backupDir - Backup directory
 * @returns Validation result
 */
async function validateBackup(
    backup: BackupMetadata,
    backupDir: string
): Promise<{ checksumValid: boolean; backupExists: boolean }> {
    const filepath = path.join(backupDir, backup.filename);

    // Check if file exists
    try {
        await fs.access(filepath);
    } catch {
        return { checksumValid: false, backupExists: false };
    }

    // Verify checksum
    try {
        const checksumCommand = `sha256sum "${filepath}"`;
        const { stdout } = await execAsync(checksumCommand);
        const checksum = stdout.split(' ')[0];

        return {
            checksumValid: checksum === backup.checksum,
            backupExists: true
        };
    } catch {
        return { checksumValid: false, backupExists: true };
    }
}

/**
 * Test database connection
 * 
 * @param dbConfig - Database configuration
 * @returns True if connectable
 */
async function testConnection(dbConfig: DbConfig): Promise<boolean> {
    try {
        const testCommand = `PGPASSWORD="${dbConfig.password}" psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d postgres -c "SELECT 1"`;
        await execAsync(testCommand);
        return true;
    } catch {
        return false;
    }
}

/**
 * Restore database from backup
 * 
 * @param options - Restore options
 * @returns Restore result
 */
export async function restoreDatabase(options: RestoreOptions = {}): Promise<RestoreResult> {
    const startTime = Date.now();
    const backupDir = process.env.BACKUP_DIR || './backups';

    logger.info('Starting database restore', { options });

    // Find backup
    const backup = await findBackup(options);

    if (!backup) {
        return {
            success: false,
            backupUsed: null as any,
            duration: Date.now() - startTime,
            dryRun: options.dryRun || false,
            validation: {
                checksumValid: false,
                backupExists: false,
                databaseConnectable: false
            },
            error: 'No suitable backup found'
        };
    }

    // Validate backup
    const validation = await validateBackup(backup, backupDir);
    const databaseConnectable = await testConnection(config);

    const fullValidation = {
        ...validation,
        databaseConnectable
    };

    // If dry run, stop here
    if (options.dryRun) {
        logger.info('Dry run completed', {
            backup: backup.id,
            validation: fullValidation
        });

        return {
            success: fullValidation.checksumValid && fullValidation.backupExists && fullValidation.databaseConnectable,
            backupUsed: backup,
            duration: Date.now() - startTime,
            dryRun: true,
            validation: fullValidation
        };
    }

    // Validate before restore
    if (!fullValidation.checksumValid) {
        return {
            success: false,
            backupUsed: backup,
            duration: Date.now() - startTime,
            dryRun: false,
            validation: fullValidation,
            error: 'Backup checksum validation failed'
        };
    }

    if (!fullValidation.databaseConnectable) {
        return {
            success: false,
            backupUsed: backup,
            duration: Date.now() - startTime,
            dryRun: false,
            validation: fullValidation,
            error: 'Cannot connect to database'
        };
    }

    // Perform restore
    try {
        const filepath = path.join(backupDir, backup.filename);
        const targetDb = options.targetDb || config.name;

        logger.warn('Restoring database (THIS WILL OVERWRITE DATA)', {
            backup: backup.id,
            targetDb
        });

        // Drop and recreate database (if not restoring to different DB)
        if (!options.targetDb) {
            const dropCommand = `PGPASSWORD="${config.password}" psql -h ${config.host} -p ${config.port} -U ${config.user} -d postgres -c "DROP DATABASE IF EXISTS ${targetDb}"`;
            await execAsync(dropCommand);

            const createCommand = `PGPASSWORD="${config.password}" psql -h ${config.host} -p ${config.port} -U ${config.user} -d postgres -c "CREATE DATABASE ${targetDb}"`;
            await execAsync(createCommand);
        }

        // Restore from backup
        const restoreCommand = `PGPASSWORD="${config.password}" pg_restore -h ${config.host} -p ${config.port} -U ${config.user} -d ${targetDb} --clean --if-exists "${filepath}"`;
        await execAsync(restoreCommand);

        const duration = Date.now() - startTime;

        logger.info('Database restore completed successfully', {
            backup: backup.id,
            targetDb,
            duration
        });

        return {
            success: true,
            backupUsed: backup,
            duration,
            dryRun: false,
            validation: fullValidation
        };

    } catch (error: any) {
        const duration = Date.now() - startTime;

        logger.error('Database restore failed', {
            backup: backup.id,
            error: error.message,
            duration
        });

        return {
            success: false,
            backupUsed: backup,
            duration,
            dryRun: false,
            validation: fullValidation,
            error: error.message
        };
    }
}

/**
 * List available restore points
 * 
 * @returns Array of backup metadata suitable for restore
 */
export async function listRestorePoints(): Promise<BackupMetadata[]> {
    const backups = await listBackups();
    return backups.filter(b => b.status === 'SUCCESS');
}

/**
 * Get RTO (Recovery Time Objective) estimate
 * 
 * Based on average restore duration.
 * 
 * @returns RTO in seconds
 */
export async function estimateRTO(): Promise<number> {
    const backups = await listBackups();
    const successfulBackups = backups.filter(b => b.status === 'SUCCESS' && b.duration > 0);

    if (successfulBackups.length === 0) {
        return 14400; // Default 4 hours
    }

    // Average backup duration * 1.5 (restore is typically slower)
    const avgBackupDuration = successfulBackups.reduce((sum, b) => sum + b.duration, 0) / successfulBackups.length;
    const estimatedRestoreDuration = avgBackupDuration * 1.5;

    // Add overhead (database restart, validation, etc.) - assume 30 min
    return Math.round(estimatedRestoreDuration / 1000) + 1800;
}
