import { NextRequest, NextResponse } from 'next/server';
import { validateContext, getContext } from '@/lib/context/context';
import { prisma } from '@/lib/db';
import { RestrictionUpdateSchema } from '@/lib/types/ari';
import { auditLogService } from '@/lib/services/audit-log.service';
import { ariService } from '@/lib/services/ari-service';
import { parseISO, eachDayOfInterval } from 'date-fns';

export async function POST(req: NextRequest) {
    // 1. Validate Context
    const contextError = validateContext(req);
    if (contextError) return contextError;

    const context = getContext(req);

    // 2. Parse & Validate Body
    let body;
    try {
        body = await req.json();
    } catch (e) {
        return NextResponse.json({
            code: 'INVALID_JSON',
            message: 'Erro ao processar JSON'
        }, { status: 400 });
    }

    const validation = RestrictionUpdateSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json({
            code: 'VALIDATION_ERROR',
            message: 'Erro de validação',
            errors: validation.error.format()
        }, { status: 400 });
    }

    const { roomTypeCode, dateRange, restrictions } = validation.data;

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
                message: 'Tipo de quarto não encontrado'
            }, { status: 404 });
        }

        // 4. Generate date list
        const fromDate = parseISO(dateRange.from);
        const toDate = parseISO(dateRange.to);
        const dates = eachDayOfInterval({ start: fromDate, end: toDate });

        // 5. Bulk upsert restrictions
        let updated = 0;

        for (const date of dates) {
            await prisma.restriction.upsert({
                where: {
                    propertyId_roomTypeId_date_ratePlanCode: {
                        propertyId: context.hotelId,
                        roomTypeId: roomType.id,
                        date,
                        ratePlanCode: 'BASE'
                    }
                },
                create: {
                    propertyId: context.hotelId,
                    roomTypeId: roomType.id,
                    date,
                    ratePlanCode: 'BASE',
                    minLOS: restrictions.minLOS ?? null,
                    maxLOS: restrictions.maxLOS ?? null,
                    closedToArrival: restrictions.closedToArrival ?? false,
                    closedToDeparture: restrictions.closedToDeparture ?? false,
                    closed: restrictions.closed ?? false
                },
                update: {
                    minLOS: restrictions.minLOS ?? null,
                    maxLOS: restrictions.maxLOS ?? null,
                    closedToArrival: restrictions.closedToArrival ?? false,
                    closedToDeparture: restrictions.closedToDeparture ?? false,
                    closed: restrictions.closed ?? false
                }
            });
            updated++;
        }

        // 6. Audit Log
        await auditLogService.log({
            eventType: 'ARI_RESTRICTION_UPDATED',
            aggregateId: roomType.id,
            aggregateType: 'RoomType',
            payload: {
                roomTypeCode,
                dateRange,
                restrictions,
                daysUpdated: updated
            },
            requestId: context.requestId,
            hotelId: context.hotelId
        });

        // 7. ARI Event (Audit Trail UI)
        await ariService.recordEvent({
            propertyId: context.hotelId,
            roomTypeCode,
            eventType: 'RESTRICTION',
            dateRange,
            payload: { restrictions, daysUpdated: updated },
            status: 'APPLIED'
        });

        return NextResponse.json({
            updated,
            roomTypeCode,
            dateRange,
            restrictions
        });

    } catch (error) {
        console.error('[ARI] Restriction update error:', error);
        return NextResponse.json({
            code: 'INTERNAL_ERROR',
            message: 'Erro ao atualizar restrições',
            details: (error as Error).message
        }, { status: 500 });
    }
}
