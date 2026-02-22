import { prisma } from '../src/lib/db';
import { addDays } from 'date-fns';

async function main() {
    // PROP-001 has: STD, DLX, PRE room types (from DB check)
    const propertyId = 'PROP-001';
    const roomTypes = [
        { id: 'e9f2c81b-2f78-4a1c-87bd-20d4f30bee79', code: 'STD' },
        { id: '2d9e11db-d408-4b71-9de7-2bf21ebaf2ef', code: 'DLX' },
        { id: 'a901eeb2-4862-40bb-a1da-0ce3a583acf3', code: 'PRE' },
    ];
    const totalInventory = 10;

    // Seed 365 days starting from 30 days ago
    const startDate = addDays(new Date(), -30);
    startDate.setUTCHours(0, 0, 0, 0);
    const daysToSeed = 365;

    for (const rt of roomTypes) {
        console.log(`Seeding ${daysToSeed} days for ${rt.code} (${rt.id})...`);
        for (let i = 0; i < daysToSeed; i++) {
            const date = addDays(startDate, i);
            date.setUTCHours(0, 0, 0, 0);

            await prisma.inventory.upsert({
                where: { propertyId_roomTypeId_date: { propertyId, roomTypeId: rt.id, date } },
                update: { total: totalInventory, available: totalInventory, booked: 0 },
                create: { propertyId, roomTypeId: rt.id, date, total: totalInventory, available: totalInventory, booked: 0 }
            });
        }
        console.log(`  -> Done.`);
    }

    console.log('All inventory seeded!');
    await prisma.$disconnect();
}

main().catch(console.error);
