/**
 * Webhook Types
 * 
 * Event-driven webhooks for real-time integrations.
 */

/**
 * Webhook event types
 */
export enum WebhookEventType {
    BOOKING_CREATED = 'BOOKING_CREATED',
    BOOKING_MODIFIED = 'BOOKING_MODIFIED',
    BOOKING_CANCELLED = 'BOOKING_CANCELLED',
    ARI_UPDATED = 'ARI_UPDATED',
    INVENTORY_LOW = 'INVENTORY_LOW',
    RATE_CHANGED = 'RATE_CHANGED',
    RESTRICTION_UPDATED = 'RESTRICTION_UPDATED'
}

/**
 * Webhook subscription
 */
export interface WebhookSubscription {
    id: string;
    hotelId: string;
    url: string;
    secret: string;           // HMAC secret for signature
    events: WebhookEventType[];
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Webhook payload
 */
export interface WebhookPayload {
    eventId: string;
    eventType: WebhookEventType;
    timestamp: string;        // ISO 8601
    hotelId: string;
    data: Record<string, any>;
    signature: string;        // HMAC-SHA256 signature
}

/**
 * Webhook delivery status
 */
export enum DeliveryStatus {
    PENDING = 'PENDING',
    SUCCESS = 'SUCCESS',
    FAILED = 'FAILED',
    RETRYING = 'RETRYING'
}

/**
 * Webhook delivery record
 */
export interface WebhookDelivery {
    id: string;
    subscriptionId: string;
    eventId: string;
    eventType: WebhookEventType;
    url: string;
    status: DeliveryStatus;
    attempts: number;
    lastAttempt?: Date;
    nextRetry?: Date;
    response?: {
        status: number;
        body: string;
    };
    createdAt: Date;
    updatedAt: Date;
}
