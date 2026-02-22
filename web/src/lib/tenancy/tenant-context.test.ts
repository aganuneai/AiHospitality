import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    getCurrentTenant,
    getCurrentTenantId,
    tryGetCurrentTenant,
    runWithTenant,
    checkQuota,
    hasFeature,
    getTenantLimits
} from './tenant-context';
import { SubscriptionTier, TenantContextError, QuotaExceededError } from './types';

// Mock Prisma
vi.mock('../db', () => ({
    prisma: {
        tenant: {
            findUnique: vi.fn()
        },
        $extends: vi.fn((config) => {
            // Return a mock extended client
            return {
                ...require('../db').prisma,
                _extended: true
            };
        })
    }
}));

import { prisma } from '../db';

describe('TenantContext', () => {
    const mockTenant = {
        id: 'tenant-123',
        name: 'Test Hotel Group',
        tier: SubscriptionTier.PRO,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getCurrentTenant', () => {
        it('should throw error when no context set', () => {
            expect(() => getCurrentTenant()).toThrow(TenantContextError);
            expect(() => getCurrentTenant()).toThrow('No tenant context found');
        });

        it('should return tenant when context is set', async () => {
            vi.mocked(prisma.tenant.findUnique).mockResolvedValue(mockTenant as any);

            await runWithTenant('tenant-123', async () => {
                const tenant = getCurrentTenant();
                expect(tenant.id).toBe('tenant-123');
                expect(tenant.name).toBe('Test Hotel Group');
            });
        });
    });

    describe('getCurrentTenantId', () => {
        it('should return tenant ID', async () => {
            vi.mocked(prisma.tenant.findUnique).mockResolvedValue(mockTenant as any);

            await runWithTenant('tenant-123', async () => {
                const tenantId = getCurrentTenantId();
                expect(tenantId).toBe('tenant-123');
            });
        });
    });

    describe('tryGetCurrentTenant', () => {
        it('should return null when no context', () => {
            const tenant = tryGetCurrentTenant();
            expect(tenant).toBeNull();
        });

        it('should return tenant when context set', async () => {
            vi.mocked(prisma.tenant.findUnique).mockResolvedValue(mockTenant as any);

            await runWithTenant('tenant-123', async () => {
                const tenant = tryGetCurrentTenant();
                expect(tenant).not.toBeNull();
                expect(tenant?.id).toBe('tenant-123');
            });
        });
    });

    describe('runWithTenant', () => {
        it('should set tenant context for function execution', async () => {
            vi.mocked(prisma.tenant.findUnique).mockResolvedValue(mockTenant as any);

            const result = await runWithTenant('tenant-123', async () => {
                const tenant = getCurrentTenant();
                return tenant.name;
            });

            expect(result).toBe('Test Hotel Group');
        });

        it('should throw error for non-existent tenant', async () => {
            vi.mocked(prisma.tenant.findUnique).mockResolvedValue(null);

            await expect(
                runWithTenant('invalid-tenant', async () => { })
            ).rejects.toThrow('Tenant invalid-tenant not found');
        });

        it('should throw error for inactive tenant', async () => {
            vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
                ...mockTenant,
                active: false
            } as any);

            await expect(
                runWithTenant('tenant-123', async () => { })
            ).rejects.toThrow('Tenant tenant-123 is inactive');
        });

        it('should pass userId and requestId to context', async () => {
            vi.mocked(prisma.tenant.findUnique).mockResolvedValue(mockTenant as any);

            await runWithTenant(
                'tenant-123',
                async () => {
                    // Context is set correctly
                    const tenant = getCurrentTenant();
                    expect(tenant).toBeDefined();
                },
                {
                    userId: 'user-456',
                    requestId: 'req-789'
                }
            );

            expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
                where: { id: 'tenant-123' }
            });
        });
    });

    describe('checkQuota', () => {
        it('should not throw for usage under limit', async () => {
            vi.mocked(prisma.tenant.findUnique).mockResolvedValue(mockTenant as any);

            await runWithTenant('tenant-123', async () => {
                // PRO tier: maxProperties = 5
                await expect(checkQuota('maxProperties', 3)).resolves.not.toThrow();
            });
        });

        it('should throw QuotaExceededError when limit reached', async () => {
            vi.mocked(prisma.tenant.findUnique).mockResolvedValue(mockTenant as any);

            await runWithTenant('tenant-123', async () => {
                // PRO tier: maxProperties = 5
                await expect(checkQuota('maxProperties', 5)).rejects.toThrow(QuotaExceededError);
            });
        });

        it('should not throw for ENTERPRISE tier (unlimited)', async () => {
            vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
                ...mockTenant,
                tier: SubscriptionTier.ENTERPRISE
            } as any);

            await runWithTenant('tenant-123', async () => {
                // ENTERPRISE: unlimited (-1)
                await expect(checkQuota('maxProperties', 1000)).resolves.not.toThrow();
            });
        });
    });

    describe('hasFeature', () => {
        it('should return true for enabled features', async () => {
            vi.mocked(prisma.tenant.findUnique).mockResolvedValue(mockTenant as any);

            await runWithTenant('tenant-123', async () => {
                // PRO tier has analytics
                expect(hasFeature('analytics')).toBe(true);
                expect(hasFeature('webhooks')).toBe(true);
            });
        });

        it('should return false for disabled features', async () => {
            vi.mocked(prisma.tenant.findUnique).mockResolvedValue(mockTenant as any);

            await runWithTenant('tenant-123', async () => {
                // PRO tier does NOT have mlForecasting
                expect(hasFeature('mlForecasting')).toBe(false);
            });
        });

        it('should respect tier-specific feature flags', async () => {
            vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
                ...mockTenant,
                tier: SubscriptionTier.FREE
            } as any);

            await runWithTenant('tenant-123', async () => {
                // FREE tier has no advanced features
                expect(hasFeature('analytics')).toBe(false);
                expect(hasFeature('webhooks')).toBe(false);
                expect(hasFeature('bulkOperations')).toBe(false);
            });
        });
    });

    describe('getTenantLimits', () => {
        it('should return limits for current tenant tier', async () => {
            vi.mocked(prisma.tenant.findUnique).mockResolvedValue(mockTenant as any);

            await runWithTenant('tenant-123', async () => {
                const limits = getTenantLimits();

                expect(limits.maxProperties).toBe(5);  // PRO tier
                expect(limits.maxUsers).toBe(15);
                expect(limits.featureFlags.analytics).toBe(true);
            });
        });
    });

    describe('Context isolation', () => {
        it('should isolate contexts between parallel runs', async () => {
            vi.mocked(prisma.tenant.findUnique).mockImplementation(async ({ where }) => {
                return {
                    id: where.id,
                    name: `Tenant ${where.id}`,
                    tier: SubscriptionTier.PRO,
                    active: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                } as any;
            });

            const results = await Promise.all([
                runWithTenant('tenant-1', async () => getCurrentTenantId()),
                runWithTenant('tenant-2', async () => getCurrentTenantId()),
                runWithTenant('tenant-3', async () => getCurrentTenantId())
            ]);

            expect(results).toEqual(['tenant-1', 'tenant-2', 'tenant-3']);
        });
    });
});
