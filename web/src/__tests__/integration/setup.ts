import { beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db';

// Setup runs before all integration tests
beforeAll(async () => {
    console.log('🧪 Setting up integration tests...');

    // Ensure database connection
    try {
        await prisma.$connect();
        console.log('✅ Database connected');
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        throw error;
    }
});

// Cleanup runs after all integration tests
afterAll(async () => {
    console.log('🧹 Cleaning up integration tests...');

    // Disconnect from database
    await prisma.$disconnect();
    console.log('✅ Database disconnected');
});

// Helper to clean up test data
export async function cleanupTestData(propertyId: string) {
    await prisma.reservation.deleteMany({
        where: { propertyId }
    });

    await prisma.inventory.deleteMany({
        where: { propertyId }
    });

    await prisma.roomType.deleteMany({
        where: { propertyId }
    });
}
