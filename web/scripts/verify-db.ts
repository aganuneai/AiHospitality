import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting DB Verification...');

    // 1. Create a Test Property
    const propertyCode = `TEST_PROP_${Date.now()}`;
    console.log(`Creating Property: ${propertyCode}`);

    const property = await prisma.property.create({
        data: {
            id: propertyCode,
            name: 'Verification Hotel',
            code: propertyCode,
            timeZone: 'UTC',
        }
    });
    console.log('Property created:', property.id);

    // 2. Create a Room Type
    const roomType = await prisma.roomType.create({
        data: {
            code: 'STD',
            name: 'Standard Room',
            propertyId: property.id,
            maxAdults: 2
        }
    });
    console.log('RoomType created:', roomType.id);

    // 3. Clean up (Optional, but good for idempotent tests)
    // await prisma.property.delete({ where: { id: property.id } });

    console.log('Verification Successful!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
