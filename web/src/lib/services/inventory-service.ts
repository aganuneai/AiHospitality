import { prisma } from '@/lib/db';
import { eachDayOfInterval, startOfDay } from 'date-fns';

export interface InventoryMatrixResponse {
    roomTypes: { id: string, code: string, name: string }[];
    days: InventoryMatrixDay[];
}

export interface InventoryMatrixDay {
    date: string;
    availability: Record<string, {
        total: number;
        booked: number;
        available: number;
        price: number;
        occupancy: number;
        status: 'CLEAN' | 'DIRTY' | 'INSPECTION' | 'OOO';
    }>;
    summary: {
        totalAvailable: number;
        avgOccupancy: number;
        avgAvailability: number;
    };
}

export class InventoryService {
    /**
     * Calcula a matriz de disponibilidade líquida para 30 dias.
     * Disponibilidade = Inventário Total - Reservas Ativas (PENDING, CONFIRMED, CHECKED_IN)
     */
    async getAvailabilityMatrix(hotelId: string, startDate: Date): Promise<InventoryMatrixResponse> {
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 29); // 30 dias total

        const dates = eachDayOfInterval({ start: startDate, end: endDate });

        // 1. Buscar todos os tipos de quarto
        const roomTypes = await prisma.roomType.findMany({
            where: { propertyId: hotelId },
            include: {
                inventory: {
                    where: { date: { gte: startDate, lte: endDate } }
                }
            }
        });

        // 2. Buscar reservas ativas no período
        const reservations = await prisma.reservation.findMany({
            where: {
                propertyId: hotelId,
                status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
                OR: [
                    { checkIn: { lte: endDate }, checkOut: { gte: startDate } }
                ]
            }
        });

        // 3. Buscar tarifas base (Rate) para o período (BASE ratePlanCode)
        const rates = await prisma.rate.findMany({
            where: {
                propertyId: hotelId,
                ratePlanCode: 'BASE',
                date: { gte: startDate, lte: endDate }
            }
        });

        // 4. Processar matriz
        const days: InventoryMatrixDay[] = dates.map(date => {
            const dateStr = date.toISOString().split('T')[0];
            const availabilityMap: InventoryMatrixDay['availability'] = {};
            let dayTotalFree = 0;
            let dayTotalInventory = 0;

            roomTypes.forEach(rt => {
                const dayInv = rt.inventory.find(i => i.date.toISOString().split('T')[0] === dateStr);
                const totalPhysical = dayInv?.total || 10; // Fallback ou valor default configurado no RT

                // Contar reservas para este tipo de quarto neste dia específico
                const bookedCount = reservations.filter(res =>
                    res.roomTypeId === rt.id &&
                    date >= startOfDay(res.checkIn) &&
                    date < startOfDay(res.checkOut)
                ).length;

                const available = totalPhysical - bookedCount;
                const dayRate = rates.find(r => r.roomTypeId === rt.id && r.date.toISOString().split('T')[0] === dateStr);

                const occupancy = totalPhysical > 0 ? Math.round((bookedCount / totalPhysical) * 100) : 0;

                availabilityMap[rt.id] = {
                    total: totalPhysical,
                    booked: bookedCount,
                    available: available,
                    price: dayRate ? Number(dayRate.amount) : 0,
                    occupancy: occupancy,
                    status: 'CLEAN' // Simplificado por enquanto
                };

                dayTotalFree += Math.max(0, available);
                dayTotalInventory += totalPhysical;
            });

            return {
                date: dateStr,
                availability: availabilityMap,
                summary: {
                    totalAvailable: dayTotalFree,
                    avgOccupancy: dayTotalInventory > 0 ? Math.round(((dayTotalInventory - dayTotalFree) / dayTotalInventory) * 100) : 0,
                    avgAvailability: dayTotalInventory > 0 ? Math.round((dayTotalFree / dayTotalInventory) * 100) : 0
                }
            };
        });

        return {
            roomTypes: roomTypes.map(rt => ({ id: rt.id, code: rt.code, name: rt.name })),
            days
        };
    }
}
