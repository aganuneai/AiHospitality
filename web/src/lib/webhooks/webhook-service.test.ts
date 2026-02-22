import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dispatchWebhook, subscribe, verifySignature } from './webhook-service';
import { WebhookEventType } from './types';
import axios from 'axios';

// Mock Prisma
vi.mock('../db', () => ({
    prisma: {
        webhookSubscription: {
            findMany: vi.fn(),
            create: vi.fn(),
            update: vi.fn()
        },
        webhookDelivery: {
            create: vi.fn(),
            update: vi.fn()
        }
    }
}));

// Mock axios
vi.mock('axios');

import { prisma } from '../db';

describe('WebhookService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('subscribe', () => {
        it('should create webhook subscription', async () => {
            vi.mocked(prisma.webhookSubscription.create).mockResolvedValue({
                id: 'sub-123',
                hotelId: 'H-001',
                url: 'https://example.com/webhook',
                secret: 'secret123',
                events: [WebhookEventType.BOOKING_CREATED],
                active: true,
                createdAt: new Date(),
                updatedAt: new Date()
            } as any);

            const result = await subscribe(
                'H-001',
                'https://example.com/webhook',
                [WebhookEventType.BOOKING_CREATED]
            );

            expect(result.id).toBe('sub-123');
            expect(result.secret).toBeDefined();
            expect(prisma.webhookSubscription.create).toHaveBeenCalled();
        });

        it('should generate unique secret', async () => {
            vi.mocked(prisma.webhookSubscription.create).mockResolvedValue({
                id: 'sub-456',
                secret: 'different-secret'
            } as any);

            const result = await subscribe(
                'H-002',
                'https://example.com/webhook2',
                [WebhookEventType.ARI_UPDATED]
            );

            expect(result.secret).toBeDefined();
            expect(result.secret.length).toBeGreaterThan(20);
        });
    });

    describe('dispatchWebhook', () => {
        it('should not dispatch when no subscriptions', async () => {
            vi.mocked(prisma.webhookSubscription.findMany).mockResolvedValue([]);

            await dispatchWebhook(
                'H-001',
                WebhookEventType.BOOKING_CREATED,
                { bookingId: 'B-123' }
            );

            expect(prisma.webhookDelivery.create).not.toHaveBeenCalled();
        });

        it('should create delivery record for each subscription', async () => {
            vi.mocked(prisma.webhookSubscription.findMany).mockResolvedValue([
                {
                    id: 'sub-1',
                    url: 'https://example1.com/webhook',
                    secret: 'secret1',
                    events: [WebhookEventType.BOOKING_CREATED]
                },
                {
                    id: 'sub-2',
                    url: 'https://example2.com/webhook',
                    secret: 'secret2',
                    events: [WebhookEventType.BOOKING_CREATED]
                }
            ] as any);

            vi.mocked(prisma.webhookDelivery.create).mockResolvedValue({
                id: 'del-123'
            } as any);

            // Mock axios to avoid actual HTTP calls
            vi.mocked(axios.post).mockRejectedValue(new Error('Network error'));

            await dispatchWebhook(
                'H-001',
                WebhookEventType.BOOKING_CREATED,
                { bookingId: 'B-123' }
            );

            // Should create 2 deliveries
            expect(prisma.webhookDelivery.create).toHaveBeenCalledTimes(2);
        });
    });

    describe('verifySignature', () => {
        it('should verify valid signature', () => {
            const payload = {
                eventId: 'evt-123',
                eventType: WebhookEventType.BOOKING_CREATED,
                timestamp: '2026-02-06T21:00:00Z',
                hotelId: 'H-001',
                data: { bookingId: 'B-123' }
            };

            const secret = 'test-secret-123';

            // Generate signature manually
            const crypto = require('crypto');
            const signature = crypto
                .createHmac('sha256', secret)
                .update(JSON.stringify(payload))
                .digest('hex');

            const isValid = verifySignature(payload, signature, secret);

            expect(isValid).toBe(true);
        });

        it('should reject invalid signature', () => {
            const payload = {
                eventId: 'evt-456',
                eventType: WebhookEventType.ARI_UPDATED,
                timestamp: '2026-02-06T21:00:00Z',
                hotelId: 'H-002',
                data: { update: 'data' }
            };

            const secret = 'test-secret-456';
            const wrongSignature = 'wrong-signature-hash';

            const isValid = verifySignature(payload, wrongSignature, secret);

            expect(isValid).toBe(false);
        });
    });
});
