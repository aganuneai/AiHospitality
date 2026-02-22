const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const roomType = await prisma.roomType.findFirst();
    if (!roomType) {
        console.log("No room type found");
        return;
    }

    console.log("Testing with roomTypeId:", roomType.id);

    const payload = {
        date: '2026-03-01',
        roomTypeId: roomType.id,
        ratePlanCode: 'BASE',
        field: 'price',
        value: 299.99
    };

    try {
        const res = await fetch('http://localhost:3000/api/v1/admin/ari/single-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        console.log("RESPONSE HTTP STATUS:", res.status);
        console.log("RESPONSE JSON:", JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("FETCH ERROR:", err);
    } finally {
        await prisma.$disconnect();
    }
}

run();
