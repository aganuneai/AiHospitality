const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    const rt = await p.roomType.findMany({ select: { id: true, code: true, name: true, propertyId: true } });
    console.log('RoomTypes:', JSON.stringify(rt, null, 2));

    const props = await p.property.findMany({ select: { id: true, name: true } });
    console.log('Properties:', JSON.stringify(props, null, 2));
}

main().catch(console.error).finally(() => p.$disconnect());
