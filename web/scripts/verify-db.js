const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
    console.log('Starting DB Verification (JS)...');

    // 1. Create a Test Property
    const propertyCode = `TEST_PROP_${Date.now()}`;
    console.log(`Creating Property: ${propertyCode}`);

    const property = await prisma.property.create({
        data: {
            id: propertyCode,
            name: 'Verification Hotel JS',
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
