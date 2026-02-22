/**
 * Restriction Types and Interfaces
 * 
 * Defines all restriction types used in hospitality inventory management.
 * Aligned with OHIP (Oracle Hospitality Integration Platform) standards.
 */

export enum RestrictionType {
    MIN_LOS = 'MIN_LOS',           // Minimum Length of Stay
    MAX_LOS = 'MAX_LOS',           // Maximum Length of Stay
    CTA = 'CTA',                   // Close To Arrival
    CTD = 'CTD',                   // Close To Departure
    STOP_SELL = 'STOP_SELL',       // No new bookings allowed
    CLOSED = 'CLOSED'              // Room type completely closed
}

export enum RestrictionError {
    MIN_LOS_VIOLATION = 'MIN_LOS_VIOLATION',
    MAX_LOS_VIOLATION = 'MAX_LOS_VIOLATION',
    CTA_VIOLATION = 'CTA_VIOLATION',
    CTD_VIOLATION = 'CTD_VIOLATION',
    STOP_SELL = 'STOP_SELL',
    ROOM_CLOSED = 'ROOM_CLOSED'
}

/**
 * Restriction model from database
 */
export interface Restriction {
    id: string;
    propertyId: string;
    roomTypeId: string;
    date: Date;

    // Arrival/Departure restrictions
    closedToArrival: boolean;
    closedToDeparture: boolean;

    // Length of Stay
    minLOS: number | null;
    maxLOS: number | null;

    // Full closure
    stopSell: boolean;
    closed: boolean;

    createdAt: Date;
    updatedAt: Date;
}

/**
 * Stay details for validation
 */
export interface Stay {
    checkIn: Date;
    checkOut: Date;
    roomTypeCode: string;
    ratePlanCode: string;
}

/**
 * Validation result from restriction checks
 */
export interface RestrictionValidation {
    valid: boolean;
    error?: RestrictionError;
    message?: string;
    restriction?: {
        type: RestrictionType;
        value?: any;
        date?: Date;
    };
}

/**
 * Configuration for restriction validators
 */
export interface RestrictionValidatorConfig {
    enabled: boolean;
    strictMode?: boolean;  // If true, any violation throws error; if false, logs warning
}

/**
 * Context for restriction validation
 */
export interface RestrictionContext {
    propertyId: string;
    roomTypeCode: string;
    ratePlanCode: string;
    checkIn: Date;
    checkOut: Date;
}
