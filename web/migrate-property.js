// Recria os dados base do usuário em HOTEL_001
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    const propertyId = 'HOTEL_001';

    // Garantir que HOTEL_001 existe
    await p.property.upsert({
        where: { id: propertyId },
        update: {},
        create: { id: propertyId, code: propertyId, name: 'AiHospitality Demo', timeZone: 'America/Sao_Paulo' }
    });

    // Room Types
    const std = await p.roomType.upsert({
        where: { propertyId_code: { propertyId, code: 'STD' } },
        update: {},
        create: { propertyId, code: 'STD', name: 'Standard', description: 'Quarto standard', maxAdults: 3, maxChildren: 3 }
    });
    const prd = await p.roomType.upsert({
        where: { propertyId_code: { propertyId, code: 'PRD' } },
        update: {},
        create: { propertyId, code: 'PRD', name: 'Presidencial', description: 'Suite presidencial', maxAdults: 4, maxChildren: 2 }
    });
    console.log('RoomTypes criados:', std.code, prd.code);

    // Rate Plans
    await p.ratePlan.upsert({
        where: { propertyId_code: { propertyId, code: 'BAR' } },
        update: {},
        create: { propertyId, code: 'BAR', name: 'Best Available Rate', description: 'Melhor tarifa disponível' }
    });
    await p.ratePlan.upsert({
        where: { propertyId_code: { propertyId, code: 'BB' } },
        update: {},
        create: { propertyId, code: 'BB', name: 'Café da Manhã Incluso', description: 'Inclui café da manhã' }
    });
    console.log('RatePlans criados: BAR, BB');

    // Quartos físicos
    await p.room.upsert({
        where: { propertyId_name: { propertyId, name: '101' } },
        update: {},
        create: { propertyId, name: '101', roomTypeId: std.id, status: 'CLEAN', tags: ['Andar Baixo'] }
    });
    await p.room.upsert({
        where: { propertyId_name: { propertyId, name: '201' } },
        update: {},
        create: { propertyId, name: '201', roomTypeId: std.id, status: 'CLEAN', tags: ['Vista Mar'] }
    });
    await p.room.upsert({
        where: { propertyId_name: { propertyId, name: 'PH-01' } },
        update: {},
        create: { propertyId, name: 'PH-01', roomTypeId: prd.id, status: 'CLEAN', tags: ['Penthouse', 'Vista Panorâmica'] }
    });
    console.log('Quartos criados: 101, 201, PH-01');

    // Inventário nos próximos 30 dias
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let inv = 0;
    for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        for (const rt of [std, prd]) {
            const existing = await p.inventory.findFirst({ where: { propertyId, roomTypeId: rt.id, date } });
            if (!existing) {
                await p.inventory.create({
                    data: { propertyId, roomTypeId: rt.id, date, total: rt.code === 'STD' ? 5 : 1, available: rt.code === 'STD' ? 5 : 1, price: rt.code === 'STD' ? 250 : 750 }
                });
                inv++;
            }
        }
    }
    console.log(`Inventário criado: ${inv} registros nos próximos 30 dias`);

    // Status final
    const finalRts = await p.roomType.findMany({ where: { propertyId }, select: { code: true, name: true } });
    console.log('\n✅ Setup concluído! Room types em HOTEL_001:', finalRts);
}

main().catch(e => console.error('ERRO:', e.message)).finally(() => p.$disconnect());
