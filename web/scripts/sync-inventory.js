
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncInventory() {
    console.log('--- Iniciando Sincronização de Inventário Físico ---');

    // 1. Obter todos os tipos de quartos e suas contagens reais
    const roomTypes = await prisma.roomType.findMany();
    const roomCounts = {};

    for (const rt of roomTypes) {
        const count = await prisma.room.count({
            where: {
                roomTypeId: rt.id,
                status: { not: 'OOO' }
            }
        });
        roomCounts[rt.id] = count;
        console.log(`Tipo: ${rt.code} (${rt.id}) -> Salas físicas: ${count}`);
    }

    // 2. Atualizar todos os registros de Inventory
    const inventories = await prisma.inventory.findMany();
    let updatedCount = 0;

    for (const inv of inventories) {
        const physicalMax = roomCounts[inv.roomTypeId] || 0;

        // Se o total estiver errado ou o disponível estiver acima do teto físico
        if (inv.total !== physicalMax || inv.available > physicalMax) {
            const safeAvailable = Math.min(inv.available, physicalMax);

            await prisma.inventory.update({
                where: { id: inv.id },
                data: {
                    total: physicalMax,
                    available: safeAvailable
                }
            });
            updatedCount++;
        }
    }

    console.log(`--- Sincronização Concluída! Registros corrigidos: ${updatedCount} ---`);
}

syncInventory()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
