const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const roomTypes = await prisma.roomType.findMany();
    console.log('Room Types:', JSON.stringify(roomTypes, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
