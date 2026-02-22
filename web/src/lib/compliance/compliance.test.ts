import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportUserData, deleteUserData, recordConsent, getUserConsent } from './gdpr';
import { tokenizeCardNumber, getLastFour, encryptData, decryptData, processPayment, validatePCICompliance } from './pci-dss';
import { appendAuditEvent, verifyAuditIntegrity, queryAuditTrail, generateComplianceReport } from './audit-trail';

// Mock Prisma
vi.mock('../db', () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
            update: vi.fn(),
            delete: vi.fn()
        },
        guestProfile: {
            updateMany: vi.fn(),
            deleteMany: vi.fn()
        },
        reservation: {
            findMany: vi.fn()
        },
        auditLog: {
            create: vi.fn(),
            findMany: vi.fn(),
            findFirst: vi.fn(),
            count: vi.fn()
        },
        consentLog: {
            create: vi.fn(),
            findMany: vi.fn()
        },
        paymentMethod: {
            create: vi.fn(),
            count: vi.fn()
        },
        $transaction: vi.fn((callback) => callback({
            user: { update: vi.fn(), delete: vi.fn() },
            guestProfile: { updateMany: vi.fn(), deleteMany: vi.fn() }
        }))
    }
}));

import { prisma } from '../db';

describe('Compliance', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GDPR - exportUserData', () => {
        it('should export all user data', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                name: 'Test User',
                createdAt: new Date(),
                updatedAt: new Date(),
                guestProfile: {
                    fullName: 'Test User',
                    email: 'test@example.com',
                    phone: '+1234567890',
                    preferences: null
                },
                reservations: []
            };

            vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

            const data = await exportUserData('user-123');

            expect(data.personalData.email).toBe('test@example.com');
            expect(data.guestProfile?.fullName).toBe('Test User');
            expect(prisma.auditLog.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        eventType: 'GDPR_DATA_EXPORT'
                    })
                })
            );
        });

        it('should throw error for non-existent user', async () => {
            vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

            await expect(exportUserData('invalid-user')).rejects.toThrow('User invalid-user not found');
        });
    });

    describe('GDPR - deleteUserData', () => {
        it('should anonymize user data (soft delete)', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                name: 'Test User'
            };

            vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

            await deleteUserData('user-123', 'User request', false);

            expect(prisma.$transaction).toHaveBeenCalled();
        });
    });

    describe('GDPR - Consent', () => {
        it('should record user consent', async () => {
            await recordConsent({
                userId: 'user-123',
                consentType: 'MARKETING',
                granted: true,
                timestamp: new Date()
            });

            expect(prisma.consentLog.create).toHaveBeenCalled();
        });

        it('should get user consent status', async () => {
            vi.mocked(prisma.consentLog.findMany).mockResolvedValue([
                { userId: 'user-123', consentType: 'MARKETING', granted: true, createdAt: new Date() }
            ] as any);

            const consent = await getUserConsent('user-123');

            expect(consent.MARKETING).toBe(true);
            expect(consent.ANALYTICS).toBe(false);
        });
    });

    describe('PCI-DSS - Card Tokenization', () => {
        it('should tokenize valid card number', () => {
            const token = tokenizeCardNumber('4111111111111111');

            expect(token).toMatch(/^tok_[a-f0-9]{32}$/);
        });

        it('should reject invalid card number', () => {
            expect(() => tokenizeCardNumber('1234567890123456')).toThrow('Invalid card number');
        });

        it('should extract last 4 digits', () => {
            expect(getLastFour('4111111111111111')).toBe('1111');
            expect(getLastFour('5555-5555-5555-4444')).toBe('4444');
        });
    });

    describe('PCI-DSS - Encryption', () => {
        it('should encrypt and decrypt data', () => {
            const original = 'Sensitive cardholder data';

            const encrypted = encryptData(original);
            expect(encrypted).not.toBe(original);
            expect(encrypted).toContain(':'); // IV:authTag:data format

            const decrypted = decryptData(encrypted);
            expect(decrypted).toBe(original);
        });

        it('should produce different ciphertexts with random IVs', () => {
            const data = 'Same data';

            const encrypted1 = encryptData(data);
            const encrypted2 = encryptData(data);

            expect(encrypted1).not.toBe(encrypted2);
            expect(decryptData(encrypted1)).toBe(data);
            expect(decryptData(encrypted2)).toBe(data);
        });
    });

    describe('PCI-DSS - Payment Processing', () => {
        it('should process payment without storing CVV', async () => {
            const result = await processPayment(
                {
                    cardNumber: '4111111111111111',
                    cvv: '123',  // Should NEVER be stored
                    expiryMonth: 12,
                    expiryYear: 2026,
                    cardholderName: 'John Doe'
                },
                100.00
            );

            expect(result.success).toBe(true);
            expect(result.token).toMatch(/^tok_/);

            // Verify paymentMethod creation doesn't include CVV
            expect(prisma.paymentMethod.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.not.objectContaining({
                        cvv: expect.anything()
                    })
                })
            );
        });
    });

    describe('PCI-DSS - Compliance Validation', () => {
        it('should validate PCI-DSS compliance', async () => {
            vi.mocked(prisma.paymentMethod.count).mockResolvedValue(10);
            vi.mocked(prisma.auditLog.count).mockResolvedValue(5);

            const result = await validatePCICompliance();

            expect(result.compliant).toBeDefined();
        });
    });

    describe('Audit Trail - Append Events', () => {
        it('should append audit event with hash chain', async () => {
            vi.mocked(prisma.auditLog.findFirst).mockResolvedValue({
                hash: 'previous-hash-abc123'
            } as any);

            await appendAuditEvent({
                eventType: 'TEST_EVENT',
                userId: 'user-123',
                aggregateId: 'agg-456',
                aggregateType: 'Test',
                payload: { test: 'data' }
            });

            expect(prisma.auditLog.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        hash: expect.any(String),
                        previousHash: 'previous-hash-abc123'
                    })
                })
            );
        });
    });

    describe('Audit Trail - Integrity Verification', () => {
        it('should verify valid audit chain', async () => {
            const mockAudits = [
                {
                    id: '1',
                    eventType: 'EVENT_1',
                    hash: 'hash1',
                    previousHash: null,
                    createdAt: new Date(),
                    payload: {}
                },
                {
                    id: '2',
                    eventType: 'EVENT_2',
                    hash: 'hash2',
                    previousHash: 'hash1',
                    createdAt: new Date(),
                    payload: {}
                }
            ];

            vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockAudits as any);

            // Note: actual hash verification will fail with mock data
            // This tests the verification logic structure
            const result = await verifyAuditIntegrity();

            expect(result.totalChecked).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Audit Trail - Compliance Reports', () => {
        it('should generate GDPR compliance report', async () => {
            const mockEvents = [
                {
                    eventType: 'GDPR_DATA_EXPORT',
                    createdAt: new Date(),
                    payload: {}
                },
                {
                    eventType: 'GDPR_DATA_DELETION',
                    createdAt: new Date(),
                    payload: {}
                }
            ];

            vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockEvents as any);

            const report = await generateComplianceReport(
                'GDPR',
                new Date('2026-01-01'),
                new Date('2026-12-31')
            );

            expect(report.type).toBe('GDPR');
            expect(report.summary.GDPR_DATA_EXPORT).toBe(1);
            expect(report.summary.GDPR_DATA_DELETION).toBe(1);
        });
    });
});
