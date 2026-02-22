import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const propertyId = 'PROP-001';

    console.log(`Seeding rooms for property: ${propertyId}...`);

    const roomTypes = await prisma.roomType.findMany({
        where: { propertyId },
    });

    if (roomTypes.length === 0) {
        console.log('No room types found for PROPERTY-001. Please seed room types first.');
        return;
    }

    console.log(`Found ${roomTypes.length} room types.`);

    let roomNumberCounter = 100;

    for (const rt of roomTypes) {
        console.log(`Creating rooms for type: ${rt.name} (${rt.code})`);

        // Create 5 rooms for each type
        for (let i = 1; i <= 5; i++) {
            const roomName = `${roomNumberCounter + i}`;

            // Check if exists
            const exists = await prisma.room.findFirst({
                where: { propertyId, name: roomName }
            });

            if (!exists) {
                await prisma.room.create({
                    data: {
                        propertyId,
                        roomTypeId: rt.id,
                        name: roomName,
                        status: 'CLEAN',
                    }
                });
                console.log(`  - Created Room ${roomName}`);
            } else {
                console.log(`  - Room ${roomName} already exists`);
            }
        }
        roomNumberCounter += 100; // Next floor/block
    }

    console.log('Use unassigned reservations? (Optional)');
    // We could also create some reservations if needed, but let's stick to rooms first.
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
