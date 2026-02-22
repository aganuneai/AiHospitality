/**
 * Multi-tenancy Types
 * 
 * Support for multi-tenant SaaS with full data isolation.
 */

/**
 * Subscription tiers
 */
export enum SubscriptionTier {
    FREE = 'FREE',           // Single property, limited features
    PRO = 'PRO',             // Up to 5 properties, advanced features
    ENTERPRISE = 'ENTERPRISE' // Unlimited, full features + SLA
}

/**
 * Tenant model
 */
export interface Tenant {
    id: string;
    name: string;
    tier: SubscriptionTier;
    limits: TenantLimits;
    settings: TenantSettings;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Resource quotas per tenant
 */
export interface TenantLimits {
    maxProperties: number;    // Max hotels/properties
    maxRoomTypes: number;      // Per property
    maxUsers: number;          // Total users
    maxBookingsPerMonth: number;
    maxAPICallsPerDay: number;
    featureFlags: {
        analytics: boolean;
        webhooks: boolean;
        bulkOperations: boolean;
        mlForecasting: boolean;
    };
}

/**
 * Tenant settings
 */
export interface TenantSettings {
    timezone: string;          // Default timezone
    currency: string;          // Default currency
    locale: string;            // i18n locale
    brandColor?: string;       // UI customization
    logoUrl?: string;
}

/**
 * Tier-based limits
 */
export const TIER_LIMITS: Record<SubscriptionTier, TenantLimits> = {
    [SubscriptionTier.FREE]: {
        maxProperties: 1,
        maxRoomTypes: 10,
        maxUsers: 3,
        maxBookingsPerMonth: 100,
        maxAPICallsPerDay: 1000,
        featureFlags: {
            analytics: false,
            webhooks: false,
            bulkOperations: false,
            mlForecasting: false
        }
    },

    [SubscriptionTier.PRO]: {
        maxProperties: 5,
        maxRoomTypes: 50,
        maxUsers: 15,
        maxBookingsPerMonth: 1000,
        maxAPICallsPerDay: 10000,
        featureFlags: {
            analytics: true,
            webhooks: true,
            bulkOperations: true,
            mlForecasting: false
        }
    },

    [SubscriptionTier.ENTERPRISE]: {
        maxProperties: -1,        // Unlimited
        maxRoomTypes: -1,
        maxUsers: -1,
        maxBookingsPerMonth: -1,
        maxAPICallsPerDay: -1,
        featureFlags: {
            analytics: true,
            webhooks: true,
            bulkOperations: true,
            mlForecasting: true
        }
    }
};

/**
 * Tenant context error
 */
export class TenantContextError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'TenantContextError';
    }
}

/**
 * Quota exceeded error
 */
export class QuotaExceededError extends Error {
    constructor(
        public resource: string,
        public limit: number,
        public current: number
    ) {
        super(`Quota exceeded for ${resource}: ${current}/${limit}`);
        this.name = 'QuotaExceededError';
    }
}
