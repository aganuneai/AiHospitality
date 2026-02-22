import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // 1. Property
    const hotelId = 'HOTEL_001';
    await prisma.property.upsert({
        where: { id: hotelId },
        update: {},
        create: {
            id: hotelId,
            code: hotelId,
            name: 'Grand Hotel Monitor',
            timeZone: 'America/Sao_Paulo',
        },
    });

    // 2. Room Type
    const roomCode = 'DLX';
    const roomType = await prisma.roomType.upsert({
        where: { propertyId_code: { propertyId: hotelId, code: roomCode } },
        update: {},
        create: {
            code: roomCode,
            name: 'Deluxe Ocean View',
            maxAdults: 2,
            propertyId: hotelId,
        },
    });

    // 2.5 Rate Plan
    const ratePlanCode = 'BAR';
    await prisma.ratePlan.upsert({
        where: { propertyId_code: { propertyId: hotelId, code: ratePlanCode } },
        update: {},
        create: {
            code: ratePlanCode,
            name: 'Best Available Rate',
            propertyId: hotelId,
        },
    });

    // 3. Inventory (Next 30 days)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);

        // We need unique constraint on Inventory? 
        // Schema likely has @@unique([propertyId, roomTypeId, date]) or similar?
        // Let's assume yes or just createMany if empty. 
        // Ideally upsert, but composed key syntax in Prisma upsert is verifying...

        // Let's check if exists first to avoid constraint errors if no unique compound is defined in schema (which would be a bug in schema, but assuming it exists)
        // Actually, let's use standard clean approach: delete checks first? No, too destructive.
        // Try create, ignore if fails?

        const existing = await prisma.inventory.findFirst({
            where: {
                propertyId: hotelId,
                roomTypeId: roomType.id,
                date: date
            }
        });

        if (!existing) {
            await prisma.inventory.create({
                data: {
                    propertyId: hotelId,
                    roomTypeId: roomType.id,
                    date: date,
                    total: 10,
                    available: 10,
                    price: 150.00, // Default seed price
                }
            });
        }
    }

    console.log('Seed completed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
