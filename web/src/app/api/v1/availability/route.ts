import { NextRequest, NextResponse } from 'next/server';
import { parseContext } from '@/lib/context/context';
import { prisma } from '@/lib/db';
import { parseISO, differenceInCalendarDays } from 'date-fns';

export async function GET(req: NextRequest) {
    // 1. Context
    const context = parseContext(req);
    if (!context || !context.hotelId) {
        return NextResponse.json({
            code: 'CONTEXT_INVALID',
            message: 'ID do hotel não fornecido'
        }, { status: 400 });
    }

    // 2. Parse query params
    const { searchParams } = new URL(req.url);
    const checkInStr = searchParams.get('checkIn');
    const checkOutStr = searchParams.get('checkOut');
    const adultsStr = searchParams.get('adults');

    if (!checkInStr || !checkOutStr) {
        return NextResponse.json({
            code: 'MISSING_PARAMS',
            message: 'Parâmetros checkIn e checkOut são obrigatórios'
        }, { status: 400 });
    }

    try {
        const checkIn = parseISO(checkInStr);
        const checkOut = parseISO(checkOutStr);
        const adults = adultsStr ? parseInt(adultsStr) : 1;
        const nights = differenceInCalendarDays(checkOut, checkIn);

        if (nights <= 0) {
            return NextResponse.json({
                code: 'INVALID_DATES',
                message: 'Data de check-out deve ser posterior ao check-in'
            }, { status: 400 });
        }

        // 3. Get all room types for this property
        const roomTypes = await prisma.roomType.findMany({
            where: {
                propertyId: context.hotelId,
                maxAdults: { gte: adults }
            }
        });

        // 4. Check inventory for each room type
        const availability = await Promise.all(
            roomTypes.map(async (roomType) => {
                const inventory = await prisma.inventory.findMany({
                    where: {
                        propertyId: context.hotelId!,
                        roomTypeId: roomType.id,
                        date: { gte: checkIn, lt: checkOut }
                    },
                    orderBy: { date: 'asc' }
                });

                // Check if we have inventory for all nights
                if (inventory.length !== nights) {
                    return {
                        roomTypeCode: roomType.code,
                        roomTypeName: roomType.name,
                        available: false,
                        reason: 'Inventário não disponível para todas as datas'
                    };
                }

                // Check if available for all nights
                const minAvailable = Math.min(...inventory.map(i => i.available));
                const isAvailable = minAvailable > 0;

                return {
                    roomTypeCode: roomType.code,
                    roomTypeName: roomType.name,
                    available: isAvailable,
                    roomsAvailable: isAvailable ? minAvailable : 0,
                    pricePerNight: inventory[0]?.price || 0,
                    totalPrice: isAvailable ? inventory.reduce((sum, inv) => sum + Number(inv.price), 0) : 0,
                    nights,
                    breakdown: inventory.map(inv => ({
                        date: inv.date.toISOString().split('T')[0],
                        price: Number(inv.price),
                        available: inv.available
                    }))
                };
            })
        );

        return NextResponse.json({
            checkIn: checkInStr,
            checkOut: checkOutStr,
            nights,
            adults,
            availability
        });

    } catch (error) {
        console.error('Erro ao consultar disponibilidade:', error);
        return NextResponse.json({
            code: 'INTERNAL_ERROR',
            message: 'Erro ao consultar disponibilidade',
            details: (error as Error).message
        }, { status: 500 });
    }
}
