const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const holidays = [
    // 2026
    { date: '2026-01-01', title: 'Confraternização Universal', type: 'HOLIDAY', color: '#ef4444' },
    { date: '2026-02-17', title: 'Carnaval', type: 'HOLIDAY', color: '#f59e0b' },
    { date: '2026-04-03', title: 'Sexta-feira Santa', type: 'HOLIDAY', color: '#ef4444' },
    { date: '2026-04-21', title: 'Tiradentes', type: 'HOLIDAY', color: '#ef4444' },
    { date: '2026-05-01', title: 'Dia do Trabalho', type: 'HOLIDAY', color: '#ef4444' },
    { date: '2026-06-04', title: 'Corpus Christi', type: 'HOLIDAY', color: '#f59e0b' },
    { date: '2026-09-07', title: 'Independência do Brasil', type: 'HOLIDAY', color: '#ef4444' },
    { date: '2026-10-12', title: 'Nossa Senhora Aparecida', type: 'HOLIDAY', color: '#ef4444' },
    { date: '2026-11-02', title: 'Finados', type: 'HOLIDAY', color: '#ef4444' },
    { date: '2026-11-15', title: 'Proclamação da República', type: 'HOLIDAY', color: '#ef4444' },
    { date: '2026-11-20', title: 'Dia da Consciência Negra', type: 'HOLIDAY', color: '#ef4444' },
    { date: '2026-12-25', title: 'Natal', type: 'HOLIDAY', color: '#ef4444' },

    // 2027
    { date: '2027-01-01', title: 'Confraternização Universal', type: 'HOLIDAY', color: '#ef4444' },
    { date: '2027-02-09', title: 'Carnaval', type: 'HOLIDAY', color: '#f59e0b' },
    { date: '2027-03-26', title: 'Sexta-feira Santa', type: 'HOLIDAY', color: '#ef4444' },
    { date: '2027-04-21', title: 'Tiradentes', type: 'HOLIDAY', color: '#ef4444' },
    { date: '2027-05-01', title: 'Dia do Trabalho', type: 'HOLIDAY', color: '#ef4444' },
    { date: '2027-05-27', title: 'Corpus Christi', type: 'HOLIDAY', color: '#f59e0b' },
    { date: '2027-09-07', title: 'Independência do Brasil', type: 'HOLIDAY', color: '#ef4444' },
    { date: '2027-10-12', title: 'Nossa Senhora Aparecida', type: 'HOLIDAY', color: '#ef4444' },
    { date: '2027-11-02', title: 'Finados', type: 'HOLIDAY', color: '#ef4444' },
    { date: '2027-11-15', title: 'Proclamação da República', type: 'HOLIDAY', color: '#ef4444' },
    { date: '2027-11-20', title: 'Dia da Consciência Negra', type: 'HOLIDAY', color: '#ef4444' },
    { date: '2027-12-25', title: 'Natal', type: 'HOLIDAY', color: '#ef4444' },

    // 2028
    { date: '2028-01-01', title: 'Confraternização Universal', type: 'HOLIDAY', color: '#ef4444' },
    { date: '2028-02-29', title: 'Carnaval', type: 'HOLIDAY', color: '#f59e0b' },
    { date: '2028-04-14', title: 'Sexta-feira Santa', type: 'HOLIDAY', color: '#ef4444' },
    { date: '2028-04-21', title: 'Tiradentes', type: 'HOLIDAY', color: '#ef4444' },
    { date: '2028-05-01', title: 'Dia do Trabalho', type: 'HOLIDAY', color: '#ef4444' },
    { date: '2028-06-15', title: 'Corpus Christi', type: 'HOLIDAY', color: '#f59e0b' },
    { date: '2028-09-07', title: 'Independência do Brasil', type: 'HOLIDAY', color: '#ef4444' },
    { date: '2028-10-12', title: 'Nossa Senhora Aparecida', type: 'HOLIDAY', color: '#ef4444' },
    { date: '2028-11-02', title: 'Finados', type: 'HOLIDAY', color: '#ef4444' },
    { date: '2028-11-15', title: 'Proclamação da República', type: 'HOLIDAY', color: '#ef4444' },
    { date: '2028-11-20', title: 'Dia da Consciência Negra', type: 'HOLIDAY', color: '#ef4444' },
    { date: '2028-12-25', title: 'Natal', type: 'HOLIDAY', color: '#ef4444' },
];

async function main() {
    console.log('Seeding holidays...');
    for (const h of holidays) {
        await prisma.calendarEvent.upsert({
            where: {
                id: h.id || 'stub-' + h.date + '-' + h.title.replace(/\s/g, '-'),
            },
            update: {},
            create: {
                date: new Date(h.date + 'T00:00:00Z'),
                title: h.title,
                type: h.type,
                color: h.color,
                propertyId: null // Global
            }
        });
    }
    console.log('Done!');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
