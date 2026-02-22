import { NextRequest, NextResponse } from 'next/server';
import { validateContext, getContext } from '@/lib/context/context';
import { prisma } from '@/lib/db';
import { AriCalendarResponse, AriCalendarDay } from '@/lib/types/ari';
import { parseISO, eachDayOfInterval, format } from 'date-fns';

export async function GET(req: NextRequest) {
    // 1. Validate Context
    const contextError = validateContext(req);
    if (contextError) return contextError;

    const context = getContext(req);
    const { searchParams } = new URL(req.url);

    // 2. Parse Query Params
    const roomTypeCode = searchParams.get('roomType');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!roomTypeCode || !from || !to) {
        return NextResponse.json({
            code: 'MISSING_PARAMS',
            message: 'Parâmetros roomType, from e to são obrigatórios'
        }, { status: 400 });
    }

    try {
        // 3. Find room type
        const roomType = await prisma.roomType.findUnique({
            where: {
                propertyId_code: {
                    propertyId: context.hotelId,
                    code: roomTypeCode
                }
            }
        });

        if (!roomType) {
            return NextResponse.json({
                code: 'NOT_FOUND',
                message: `Tipo de quarto não encontrado: ${roomTypeCode}`
            }, { status: 404 });
        }

        // 4. Generate date range
        const fromDate = parseISO(from);
        const toDate = parseISO(to);
        const dates = eachDayOfInterval({ start: fromDate, end: toDate });

        // 5. Fetch inventory for all dates
        const inventory = await prisma.inventory.findMany({
            where: {
                propertyId: context.hotelId,
                roomTypeId: roomType.id,
                date: {
                    gte: fromDate,
                    lte: toDate
                }
            }
        });

        // 6. Fetch restrictions for all dates
        const restrictions = await prisma.restriction.findMany({
            where: {
                propertyId: context.hotelId,
                roomTypeId: roomType.id,
                date: {
                    gte: fromDate,
                    lte: toDate
                }
            }
        });

        // 7. Create maps for quick lookup
        const inventoryMap = new Map(
            inventory.map(inv => [format(inv.date, 'yyyy-MM-dd'), inv])
        );
        const restrictionMap = new Map(
            restrictions.map(res => [format(res.date, 'yyyy-MM-dd'), res])
        );

        // 8. Build calendar response
        const days: AriCalendarDay[] = dates.map(date => {
            const dateStr = format(date, 'yyyy-MM-dd');
            const inv = inventoryMap.get(dateStr);
            const res = restrictionMap.get(dateStr);

            return {
                date: dateStr,
                available: inv?.available ?? 0,
                total: inv?.total ?? 0,
                rate: inv?.price ? Number(inv.price) : null,
                restrictions: {
                    minLOS: res?.minLOS ?? null,
                    maxLOS: res?.maxLOS ?? null,
                    closedToArrival: res?.closedToArrival ?? false,
                    closedToDeparture: res?.closedToDeparture ?? false,
                    closed: res?.closed ?? false
                }
            };
        });

        const response: AriCalendarResponse = {
            roomTypeCode,
            dateRange: { from, to },
            days
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('[ARI] Calendar fetch error:', error);
        return NextResponse.json({
            code: 'INTERNAL_ERROR',
            message: 'Erro ao buscar calendário ARI',
            details: (error as Error).message
        }, { status: 500 });
    }
}
