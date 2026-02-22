import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/db';

describe('Prisma Test Connection', () => {
    it('should create property successfully', async () => {
        const property = await prisma.property.create({
            data: {
                id: 'test-simple',
                code: 'TEST_SIMPLE',
                name: 'Test Simple Property'
            }
        });

        expect(property.id).toBe('test-simple');

        // Cleanup
        await prisma.property.delete({ where: { id: 'test-simple' } });
    });
});
