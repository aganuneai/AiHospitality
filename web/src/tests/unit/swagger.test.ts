import { describe, it, expect } from 'vitest';
import { swaggerSpec } from '@/lib/swagger/config';

describe('Swagger Configuration', () => {
    it('should have Monetization schemas', () => {
        expect(swaggerSpec.components.schemas).toHaveProperty('Package');
        expect(swaggerSpec.components.schemas).toHaveProperty('UpsellRule');
        expect(swaggerSpec.components.schemas).toHaveProperty('UpsellOffer');
    });

    it('should have Monetization paths', () => {
        expect(swaggerSpec.paths).toHaveProperty('/packages');
        expect(swaggerSpec.paths).toHaveProperty('/upsell');
        expect(swaggerSpec.paths).toHaveProperty('/bookings/{id}/upsell');
        expect(swaggerSpec.paths).toHaveProperty('/payments/split');
    });

    it('should define GET /packages parameters', () => {
        const getPackages = swaggerSpec.paths['/packages'].get;
        expect(getPackages.parameters).toHaveLength(4);
        expect(getPackages.parameters.map((p: any) => p.name)).toContain('propertyId');
    });
});
