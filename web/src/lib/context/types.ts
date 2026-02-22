/**
 * Context Types and Envelope
 * 
 * Defines the standardized context envelope for all API requests.
 * Based on OpenTravel Alliance (OTA) and hospitality API standards.
 */

/**
 * Context domain types
 */
export enum ContextDomain {
    DISTRIBUTION = 'DISTRIBUTION',  // Booking engine, OTAs, Channel Manager
    PMS = 'PMS',                    // Property Management System
    CRS = 'CRS',                    // Central Reservation System
    ADMIN = 'ADMIN'                 // Admin panel, direct management
}

/**
 * Context validation errors
 */
export enum ContextError {
    MISSING_HOTEL_ID = 'MISSING_HOTEL_ID',
    INVALID_HOTEL_ID = 'INVALID_HOTEL_ID',
    MISSING_DOMAIN = 'MISSING_DOMAIN',
    INVALID_DOMAIN = 'INVALID_DOMAIN',
    MISSING_APP_KEY = 'MISSING_APP_KEY',
    INVALID_APP_KEY = 'INVALID_APP_KEY',
    MISSING_CHANNEL_CODE = 'MISSING_CHANNEL_CODE',
    INVALID_CHANNEL_CODE = 'INVALID_CHANNEL_CODE',
    MISSING_HUB_ID = 'MISSING_HUB_ID',
    UNAUTHORIZED = 'UNAUTHORIZED'
}

/**
 * Context envelope for API requests
 * 
 * All API requests must include this context in headers:
 * - x-hotel-id: Property identifier
 * - x-domain: Request domain (DISTRIBUTION, PMS, etc.)
 * - x-app-key: Application API key (for auth)
 * - x-channel-code (optional): Channel identifier for multi-channel
 * - x-hub-id (optional): Hub identifier for multi-property
 */
export interface ContextEnvelope {
    hotelId: string;
    domain: ContextDomain;
    appKey: string;
    channelCode?: string;
    hubId?: string;

    // Optional metadata
    userAgent?: string;
    ipAddress?: string;
}

/**
 * Context validation result
 */
export interface ContextValidationResult {
    valid: boolean;
    context?: ContextEnvelope;
    error?: ContextError;
    message?: string;
}

/**
 * Context requirements per domain
 */
export const DOMAIN_REQUIREMENTS: Record<ContextDomain, {
    requiresChannelCode: boolean;
    requiresHubId: boolean;
    description: string;
}> = {
    [ContextDomain.DISTRIBUTION]: {
        requiresChannelCode: true,
        requiresHubId: true,
        description: 'Booking engine or OTA requests'
    },
    [ContextDomain.PMS]: {
        requiresChannelCode: false,
        requiresHubId: false,
        description: 'Property Management System'
    },
    [ContextDomain.CRS]: {
        requiresChannelCode: false,
        requiresHubId: true,
        description: 'Central Reservation System'
    },
    [ContextDomain.ADMIN]: {
        requiresChannelCode: false,
        requiresHubId: false,
        description: 'Admin panel direct access'
    }
};
