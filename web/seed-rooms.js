const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedRooms() {
    console.log("Starting Room Seed...");
    const hotelId = 'HOTEL_001';

    try {
        // Fetch all room types for the property
        const roomTypes = await prisma.roomType.findMany({
            where: { propertyId: hotelId }
        });

        if (roomTypes.length === 0) {
            console.error("No room types found! Cannot seed physical rooms.");
            return;
        }

        console.log(`Found ${roomTypes.length} room types. Mapping to STD and PRD...`);

        // Heuristically find the best match for STD and PRD.
        // If not found by exact code, just pick the first ones available or create them.
        let stdType = roomTypes.find(rt => rt.code === 'STD' || rt.name.toLowerCase().includes('standard'));
        let prdType = roomTypes.find(rt => rt.code === 'PRD' || rt.code === 'PREM' || rt.code === 'SUITE' || rt.name.toLowerCase().includes('premium') || rt.name.toLowerCase().includes('presidential'));

        // If they don't exist, use fallback room types so the script doesn't fail.
        if (!stdType) {
            console.log("No specific 'STD' room type found, using the first available room type as STD.");
            stdType = roomTypes[0];
        }
        if (!prdType) {
            console.log("No specific 'PRD' room type found, using the second or fallback room type as PRD.");
            prdType = roomTypes.length > 1 ? roomTypes[1] : roomTypes[0];
        }

        console.log(`Using RoomType [${stdType.code}] for STD (90 rooms)`);
        console.log(`Using RoomType [${prdType.code}] for PRD (10 rooms)`);

        // First, clear existing rooms to avoid unique constraint conflicts if running multiple times
        console.log("Clearing existing rooms...");
        await prisma.room.deleteMany({
            where: { propertyId: hotelId }
        });

        const newRooms = [];
        let roomCounter = 101;
        let floor = 1;

        // Generate 90 STD rooms (spread across floors 1-8)
        for (let i = 0; i < 90; i++) {
            // Logic for realistic numbering: 101-112, 201-212, etc.
            if (i > 0 && i % 12 === 0) {
                floor++;
                roomCounter = (floor * 100) + 1;
            }

            newRooms.push({
                propertyId: hotelId,
                roomTypeId: stdType.id,
                name: roomCounter.toString(),
                status: "CLEAN",
                tags: Math.random() > 0.5 ? ["Standard", "Quiet"] : ["Standard", "Near Elevator"]
            });
            roomCounter++;
        }

        // Generate 10 PRD rooms (on floor 9)
        floor = 9;
        roomCounter = (floor * 100) + 1;
        for (let i = 0; i < 10; i++) {
            newRooms.push({
                propertyId: hotelId,
                roomTypeId: prdType.id,
                name: roomCounter.toString(),
                status: "CLEAN",
                tags: ["Premium", "High Floor", "Ocean View"]
            });
            roomCounter++;
        }

        console.log(`Inserting ${newRooms.length} rooms...`);
        const result = await prisma.room.createMany({
            data: newRooms,
            skipDuplicates: true
        });

        console.log(`Successfully seeded ${result.count} physical rooms!`);

    } catch (e) {
        console.error("Error seeding rooms:", e);
    } finally {
        await prisma.$disconnect();
    }
}

seedRooms();
