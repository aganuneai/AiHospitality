import { NextRequest, NextResponse } from 'next/server';
import { validateContext, getContext } from '@/lib/context/context';
import { prisma } from '@/lib/db';
import { AvailabilityUpdateSchema } from '@/lib/types/ari';
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

    const validation = AvailabilityUpdateSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json({
            code: 'VALIDATION_ERROR',
            message: 'Erro de validação',
            errors: validation.error.format()
        }, { status: 400 });
    }

    const { roomTypeCode, dateRange, availability, updateType } = validation.data;

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

        // 5. Bulk update availability
        let updated = 0;

        // HARD-CAP OVERBOOKING PROTECTION
        const physicalCount = await prisma.room.count({
            where: { roomTypeId: roomType.id, status: { not: 'OOO' } }
        });

        for (const date of dates) {
            const existing = await prisma.inventory.findUnique({
                where: {
                    propertyId_roomTypeId_date: {
                        propertyId: context.hotelId,
                        roomTypeId: roomType.id,
                        date
                    }
                }
            });

            if (existing) {
                // Update existing
                let newAvailability = availability;

                if (updateType === 'INCREMENT') {
                    newAvailability = existing.available + availability;
                } else if (updateType === 'DECREMENT') {
                    newAvailability = Math.max(0, existing.available - availability);
                }

                // MATHEMATICAL SAFEGUARD
                const safeAvailability = Math.min(newAvailability, physicalCount);

                await prisma.inventory.update({
                    where: {
                        propertyId_roomTypeId_date: {
                            propertyId: context.hotelId,
                            roomTypeId: roomType.id,
                            date
                        }
                    },
                    data: {
                        available: safeAvailability,
                        total: physicalCount
                    }
                });
                updated++;
            } else {
                // Safeguard creations too
                const safeNewAvailability = Math.min(availability, physicalCount);

                // Create new inventory record
                await prisma.inventory.create({
                    data: {
                        propertyId: context.hotelId,
                        roomTypeId: roomType.id,
                        date,
                        total: physicalCount,
                        available: safeNewAvailability,
                        booked: 0
                    }
                });
                updated++;
            }
        }

        // 6. Audit Log
        await auditLogService.log({
            eventType: 'ARI_AVAILABILITY_UPDATED',
            aggregateId: roomType.id,
            aggregateType: 'RoomType',
            payload: {
                roomTypeCode,
                dateRange,
                availability,
                updateType,
                daysUpdated: updated
            },
            requestId: context.requestId,
            hotelId: context.hotelId
        });

        // 7. ARI Event (Audit Trail UI)
        await ariService.recordEvent({
            propertyId: context.hotelId,
            roomTypeCode,
            eventType: 'AVAILABILITY',
            dateRange,
            payload: { availability, updateType, daysUpdated: updated },
            status: 'APPLIED'
        });

        return NextResponse.json({
            updated,
            roomTypeCode,
            dateRange,
            availability
        });

    } catch (error) {
        console.error('[ARI] Availability update error:', error);
        return NextResponse.json({
            code: 'INTERNAL_ERROR',
            message: 'Erro ao atualizar disponibilidade',
            details: (error as Error).message
        }, { status: 500 });
    }
}
