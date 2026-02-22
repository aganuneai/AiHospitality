import { NextRequest, NextResponse } from 'next/server';
import { validateContext, getContext } from '@/lib/context/context';
import { prisma } from '@/lib/db';
import { RateUpdateSchema } from '@/lib/types/ari';
import { auditLogService } from '@/lib/services/audit-log.service';
import { ariService } from '@/lib/services/ari-service';
import { parseISO, eachDayOfInterval } from 'date-fns';
import { Decimal } from '@prisma/client/runtime/library';

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

    const validation = RateUpdateSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json({
            code: 'VALIDATION_ERROR',
            message: 'Erro de validação',
            errors: validation.error.format()
        }, { status: 400 });
    }

    const { roomTypeCode, dateRange, rates, baseRate } = validation.data;

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

        // 5. Create rate map
        const rateMap = new Map<string, number>();

        if (rates) {
            // Individual rates per date
            rates.forEach(r => rateMap.set(r.date, r.price));
        } else if (baseRate) {
            // Same rate for all dates
            dates.forEach(date => {
                const dateStr = date.toISOString().split('T')[0];
                rateMap.set(dateStr, baseRate);
            });
        }

        // 6. Bulk update rates
        let updated = 0;
        let totalRate = 0;

        for (const date of dates) {
            const dateStr = date.toISOString().split('T')[0];
            const price = rateMap.get(dateStr);

            if (!price) continue;

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
                await prisma.inventory.update({
                    where: {
                        propertyId_roomTypeId_date: {
                            propertyId: context.hotelId,
                            roomTypeId: roomType.id,
                            date
                        }
                    },
                    data: {
                        price: new Decimal(price)
                    }
                });
                updated++;
                totalRate += price;
            } else {
                // HARD-CAP OVERBOOKING PROTECTION
                // If creating a new tracking row, do not invent 10 rooms. Look at hardware.
                const physicalCount = await prisma.room.count({
                    where: { roomTypeId: roomType.id, status: { not: 'OOO' } }
                });

                // Create new inventory record with rate
                await prisma.inventory.create({
                    data: {
                        propertyId: context.hotelId,
                        roomTypeId: roomType.id,
                        date,
                        total: physicalCount,
                        available: physicalCount, // Start safely at physical max
                        booked: 0,
                        price: new Decimal(price)
                    }
                });
                updated++;
                totalRate += price;
            }
        }

        const avgRate = updated > 0 ? totalRate / updated : 0;

        // 7. Audit Log
        await auditLogService.log({
            eventType: 'ARI_RATE_UPDATED',
            aggregateId: roomType.id,
            aggregateType: 'RoomType',
            payload: {
                roomTypeCode,
                dateRange,
                daysUpdated: updated,
                avgRate
            },
            requestId: context.requestId,
            hotelId: context.hotelId
        });

        // 8. ARI Event (Audit Trail UI)
        await ariService.recordEvent({
            propertyId: context.hotelId,
            roomTypeCode,
            eventType: 'RATE',
            dateRange,
            payload: { avgRate, daysUpdated: updated },
            status: 'APPLIED'
        });

        return NextResponse.json({
            updated,
            roomTypeCode,
            dateRange,
            avgRate: Math.round(avgRate * 100) / 100
        });

    } catch (error) {
        console.error('[ARI] Rate update error:', error);
        return NextResponse.json({
            code: 'INTERNAL_ERROR',
            message: 'Erro ao atualizar tarifas',
            details: (error as Error).message
        }, { status: 500 });
    }
}
