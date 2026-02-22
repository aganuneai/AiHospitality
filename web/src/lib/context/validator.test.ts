import { describe, it, expect } from 'vitest';
import { extractContext, validateAppKey } from './validator';
import { ContextDomain, ContextError } from './types';

describe('Context Validator', () => {
    describe('extractContext', () => {
        it('should extract valid DISTRIBUTION context', () => {
            const headers = {
                'x-hotel-id': 'H-001',
                'x-domain': 'DISTRIBUTION',
                'x-app-key': 'app-key-123456',
                'x-channel-code': 'CH-ABC',
                'x-hub-id': 'HUB-001'
            };

            const result = extractContext(headers);

            expect(result.valid).toBe(true);
            expect(result.context).toBeDefined();
            expect(result.context?.hotelId).toBe('H-001');
            expect(result.context?.domain).toBe(ContextDomain.DISTRIBUTION);
            expect(result.context?.appKey).toBe('app-key-123456');
            expect(result.context?.channelCode).toBe('CH-ABC');
            expect(result.context?.hubId).toBe('HUB-001');
        });

        it('should extract valid PMS context without optional fields', () => {
            const headers = {
                'x-hotel-id': 'H-002',
                'x-domain': 'PMS',
                'x-app-key': 'pms-key-789012'
            };

            const result = extractContext(headers);

            expect(result.valid).toBe(true);
            expect(result.context).toBeDefined();
            expect(result.context?.domain).toBe(ContextDomain.PMS);
            expect(result.context?.channelCode).toBeUndefined();
            expect(result.context?.hubId).toBeUndefined();
        });

        it('should fail when hotel ID is missing', () => {
            const headers = {
                'x-domain': 'ADMIN',
                'x-app-key': 'admin-key-345678'
            };

            const result = extractContext(headers);

            expect(result.valid).toBe(false);
            expect(result.error).toBe(ContextError.MISSING_HOTEL_ID);
            expect(result.message).toContain('x-hotel-id');
        });

        it('should fail when domain is missing', () => {
            const headers = {
                'x-hotel-id': 'H-003',
                'x-app-key': 'app-key-901234'
            };

            const result = extractContext(headers);

            expect(result.valid).toBe(false);
            expect(result.error).toBe(ContextError.MISSING_DOMAIN);
        });

        it('should fail when domain is invalid', () => {
            const headers = {
                'x-hotel-id': 'H-003',
                'x-domain': 'INVALID_DOMAIN',
                'x-app-key': 'app-key-901234'
            };

            const result = extractContext(headers);

            expect(result.valid).toBe(false);
            expect(result.error).toBe(ContextError.INVALID_DOMAIN);
        });

        it('should fail when app key is missing', () => {
            const headers = {
                'x-hotel-id': 'H-004',
                'x-domain': 'CRS'
            };

            const result = extractContext(headers);

            expect(result.valid).toBe(false);
            expect(result.error).toBe(ContextError.MISSING_APP_KEY);
        });

        it('should fail when DISTRIBUTION domain missing channel code', () => {
            const headers = {
                'x-hotel-id': 'H-005',
                'x-domain': 'DISTRIBUTION',
                'x-app-key': 'app-key-567890',
                'x-hub-id': 'HUB-002'
                // Missing x-channel-code
            };

            const result = extractContext(headers);

            expect(result.valid).toBe(false);
            expect(result.error).toBe(ContextError.MISSING_CHANNEL_CODE);
        });

        it('should fail when DISTRIBUTION domain missing hub ID', () => {
            const headers = {
                'x-hotel-id': 'H-006',
                'x-domain': 'DISTRIBUTION',
                'x-app-key': 'app-key-678901',
                'x-channel-code': 'CH-XYZ'
                // Missing x-hub-id
            };

            const result = extractContext(headers);

            expect(result.valid).toBe(false);
            expect(result.error).toBe(ContextError.MISSING_HUB_ID);
        });

        it('should extract metadata fields', () => {
            const headers = {
                'x-hotel-id': 'H-007',
                'x-domain': 'ADMIN',
                'x-app-key': 'admin-key-123456',
                'user-agent': 'Mozilla/5.0',
                'x-forwarded-for': '192.168.1.100'
            };

            const result = extractContext(headers);

            expect(result.valid).toBe(true);
            expect(result.context?.userAgent).toBe('Mozilla/5.0');
            expect(result.context?.ipAddress).toBe('192.168.1.100');
        });

        it('should handle Headers object', () => {
            const headers = new Headers();
            headers.set('x-hotel-id', 'H-008');
            headers.set('x-domain', 'PMS');
            headers.set('x-app-key', 'pms-key-111222');

            const result = extractContext(headers);

            expect(result.valid).toBe(true);
            expect(result.context?.hotelId).toBe('H-008');
        });

        it('should validate hotel ID format', () => {
            const headers = {
                'x-hotel-id': 'a',  // Too short
                'x-domain': 'ADMIN',
                'x-app-key': 'admin-key-333444'
            };

            const result = extractContext(headers);

            expect(result.valid).toBe(false);
            expect(result.error).toBe(ContextError.INVALID_HOTEL_ID);
        });
    });

    describe('validateAppKey', () => {
        it('should accept valid app key in MVP mode', async () => {
            const isValid = await validateAppKey('app-key-1234567890', 'H-001');
            expect(isValid).toBe(true);
        });

        it('should reject too short app key', async () => {
            const isValid = await validateAppKey('short', 'H-001');
            expect(isValid).toBe(false);
        });

        it('should reject empty app key', async () => {
            const isValid = await validateAppKey('', 'H-001');
            expect(isValid).toBe(false);
        });
    });
});
