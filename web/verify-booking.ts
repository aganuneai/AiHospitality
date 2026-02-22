import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('=== Verificando Última Reserva ===\n');

    const reservation = await prisma.reservation.findFirst({
        orderBy: { createdAt: 'desc' },
        include: {
            guest: true,
            roomType: true
        }
    });

    if (!reservation) {
        console.log('❌ Nenhuma reserva encontrada no banco.');
        return;
    }

    console.log('✅ Reserva encontrada:');
    console.log('  PNR:', reservation.pnr);
    console.log('  Status:', reservation.status);
    console.log('  Check-in:', reservation.checkIn.toISOString().split('T')[0]);
    console.log('  Check-out:', reservation.checkOut.toISOString().split('T')[0]);
    console.log('  Total:', `R$ ${reservation.total}`);
    console.log('');
    console.log('👤 Hóspede:');
    console.log('  Nome:', reservation.guest.fullName);
    console.log('  Email:', reservation.guest.email);
    console.log('');
    console.log('🏨 Quarto:');
    console.log('  Tipo:', reservation.roomType.name);
}

main()
    .catch(e => console.error('Erro:', e))
    .finally(async () => {
        await prisma.$disconnect();
    });
