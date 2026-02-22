const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const rates = await prisma.rate.findMany({
        where: {
            date: { gte: new Date('2026-02-25T00:00:00Z'), lte: new Date('2026-03-02T23:59:59Z') }
        }
    });

    const byDate = {};
    rates.forEach(r => {
        const d = r.date.toISOString();
        if (!byDate[d]) byDate[d] = 0;
        byDate[d]++;
    });

    console.log("Rates found between 25 Feb and 2 March:");
    for (const [d, count] of Object.entries(byDate)) {
        console.log(`- ${d}: ${count} rates`);
    }
}

main().finally(() => process.exit(0));
