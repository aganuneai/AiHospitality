import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const count = await prisma.reservation.count();
    console.log(`Total Reservations: ${count}`);

    const reservations = await prisma.reservation.findMany({
        include: {
            guest: true,
            folio: true
        },
        orderBy: { createdAt: 'desc' },
        take: 1
    });

    if (reservations.length > 0) {
        const res = reservations[0];
        console.log('Latest Reservation:', {
            id: res.id,
            pnr: res.pnr,
            guest: res.guest.fullName,
            total: res.total,
            folioStatus: res.folio?.status
        });
    } else {
        console.log('No reservations found.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
