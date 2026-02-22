import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDatabaseBackup, listBackups, applyRetentionPolicy, BackupType } from './backup-service';
import { restoreDatabase, listRestorePoints, estimateRTO } from './restore-service';
import { checkBackupHealth, verifyBackupIntegrity } from './backup-monitor';

// Mock child_process
vi.mock('child_process', () => ({
    exec: vi.fn((cmd, callback) => {
        // Mock successful execution
        callback(null, { stdout: 'success', stderr: '' });
    })
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
    mkdir: vi.fn(),
    stat: vi.fn(() => ({ size: 1024000 })),
    writeFile: vi.fn(),
    readdir: vi.fn(() => []),
    readFile: vi.fn(),
    unlink: vi.fn(),
    access: vi.fn()
}));

describe('Disaster Recovery', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createDatabaseBackup', () => {
        it('should create backup with metadata', async () => {
            const { exec } = await import('child_process');
            const fs = await import('fs/promises');

            vi.mocked(exec).mockImplementation((cmd: any, callback: any) => {
                if (cmd.includes('pg_dump')) {
                    callback(null, { stdout: '', stderr: '' });
                } else if (cmd.includes('sha256sum')) {
                    callback(null, { stdout: 'abc123def456 file.sql.gz', stderr: '' });
                }
                return {} as any;
            });

            const backup = await createDatabaseBackup(BackupType.DAILY);

            expect(backup.type).toBe(BackupType.DAILY);
            expect(backup.status).toBe('SUCCESS');
            expect(backup.checksum).toBe('abc123def456');
            expect(fs.mkdir).toHaveBeenCalled();
            expect(fs.writeFile).toHaveBeenCalled();
        });

        it('should handle backup failure', async () => {
            const { exec } = await import('child_process');

            vi.mocked(exec).mockImplementation((cmd: any, callback: any) => {
                callback(new Error('pg_dump failed'), null);
                return {} as any;
            });

            await expect(createDatabaseBackup(BackupType.DAILY)).rejects.toThrow('pg_dump failed');
        });
    });

    describe('applyRetentionPolicy', () => {
        it('should delete old backups beyond retention', async () => {
            const fs = await import('fs/promises');

            // Mock 10 daily backups (retention is 7)
            const mockBackups = Array.from({ length: 10 }, (_, i) => ({
                id: `backup-${i}`,
                filename: `backup-${i}.sql.gz`,
                type: BackupType.DAILY,
                status: 'SUCCESS',
                timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
                size: 1000,
                duration: 100,
                checksum: 'abc123'
            }));

            vi.mocked(fs.readdir).mockResolvedValue(
                mockBackups.map(b => `${b.id}.json`) as any
            );

            vi.mocked(fs.readFile).mockImplementation(async (file: any) => {
                const id = file.toString().replace('.json', '').split('/').pop();
                const backup = mockBackups.find(b => b.id === id);
                return JSON.stringify(backup);
            });

            await applyRetentionPolicy(BackupType.DAILY);

            // Should delete 3 backups (10 - 7 retention)
            expect(fs.unlink).toHaveBeenCalledTimes(6); // 3 backups * 2 files each
        });
    });

    describe('restoreDatabase', () => {
        it('should restore from most recent backup', async () => {
            const { exec } = await import('child_process');
            const fs = await import('fs/promises');

            const mockBackup = {
                id: 'backup-1',
                filename: 'backup.sql.gz',
                type: BackupType.DAILY,
                status: 'SUCCESS',
                timestamp: new Date(),
                size: 1000,
                duration: 100,
                checksum: 'abc123'
            };

            vi.mocked(fs.readdir).mockResolvedValue(['backup-1.json'] as any);
            vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockBackup));
            vi.mocked(fs.access).mockResolvedValue(undefined);

            vi.mocked(exec).mockImplementation((cmd: any, callback: any) => {
                if (cmd.includes('sha256sum')) {
                    callback(null, { stdout: 'abc123 file.sql.gz', stderr: '' });
                } else if (cmd.includes('psql') || cmd.includes('pg_restore')) {
                    callback(null, { stdout: 'success', stderr: '' });
                }
                return {} as any;
            });

            const result = await restoreDatabase();

            expect(result.success).toBe(true);
            expect(result.backupUsed.id).toBe('backup-1');
            expect(result.validation.checksumValid).toBe(true);
        });

        it('should perform dry run without restoring', async () => {
            const { exec } = await import('child_process');
            const fs = await import('fs/promises');

            const mockBackup = {
                id: 'backup-1',
                filename: 'backup.sql.gz',
                type: BackupType.DAILY,
                status: 'SUCCESS',
                timestamp: new Date(),
                size: 1000,
                duration: 100,
                checksum: 'abc123'
            };

            vi.mocked(fs.readdir).mockResolvedValue(['backup-1.json'] as any);
            vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockBackup));
            vi.mocked(fs.access).mockResolvedValue(undefined);

            vi.mocked(exec).mockImplementation((cmd: any, callback: any) => {
                callback(null, { stdout: 'abc123 file.sql.gz', stderr: '' });
                return {} as any;
            });

            const result = await restoreDatabase({ dryRun: true });

            expect(result.dryRun).toBe(true);
            // Restore should not be called in dry run
            expect(exec).not.toHaveBeenCalledWith(expect.stringContaining('pg_restore'), expect.anything());
        });
    });

    describe('checkBackupHealth', () => {
        it('should report healthy status with recent backups', async () => {
            const fs = await import('fs/promises');

            const recentBackup = {
                id: 'backup-1',
                filename: 'backup.sql.gz',
                type: BackupType.DAILY,
                status: 'SUCCESS',
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
                size: 1000,
                duration: 100,
                checksum: 'abc123'
            };

            vi.mocked(fs.readdir).mockResolvedValue(['backup-1.json'] as any);
            vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(recentBackup));

            const health = await checkBackupHealth();

            expect(health.healthy).toBe(true);
            expect(health.issues).toHaveLength(0);
            expect(health.lastBackup?.hoursAgo).toBeLessThan(3);
        });

        it('should report unhealthy when backups are old', async () => {
            const fs = await import('fs/promises');

            const oldBackup = {
                id: 'backup-1',
                filename: 'backup.sql.gz',
                type: BackupType.DAILY,
                status: 'SUCCESS',
                timestamp: new Date(Date.now() - 30 * 60 * 60 * 1000), // 30 hours ago
                size: 1000,
                duration: 100,
                checksum: 'abc123'
            };

            vi.mocked(fs.readdir).mockResolvedValue(['backup-1.json'] as any);
            vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(oldBackup));

            const health = await checkBackupHealth();

            expect(health.healthy).toBe(false);
            expect(health.issues.length).toBeGreaterThan(0);
        });
    });

    describe('verifyBackupIntegrity', () => {
        it('should verify backup checksums', async () => {
            const { exec } = await import('child_process');
            const fs = await import('fs/promises');

            const mockBackup = {
                id: 'backup-1',
                filename: 'backup.sql.gz',
                type: BackupType.DAILY,
                status: 'SUCCESS',
                timestamp: new Date(),
                size: 1000,
                duration: 100,
                checksum: 'abc123'
            };

            vi.mocked(fs.readdir).mockResolvedValue(['backup-1.json'] as any);
            vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockBackup));

            vi.mocked(exec).mockImplementation((cmd: any, callback: any) => {
                callback(null, { stdout: 'abc123 file.sql.gz', stderr: '' });
                return {} as any;
            });

            const result = await verifyBackupIntegrity(1);

            expect(result.verified).toBe(1);
            expect(result.failed).toBe(0);
        });
    });
});
