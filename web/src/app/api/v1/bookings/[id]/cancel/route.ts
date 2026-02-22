import { NextRequest, NextResponse } from 'next/server';
import { parseContext } from '@/lib/context/context';
import { prisma } from '@/lib/db';
import { auditLogService } from '@/lib/services/audit-log.service';

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    // 1. Context
    const context = parseContext(req);
    if (!context || !context.hotelId) {
        return NextResponse.json({
            code: 'CONTEXT_INVALID',
            message: 'ID do hotel não fornecido'
        }, { status: 400 });
    }

    const { id: reservationId } = await params;

    if (!reservationId) {
        return NextResponse.json({
            code: 'INVALID_REQUEST',
            message: 'ID da reserva não fornecido'
        }, { status: 400 });
    }

    try {
        // 2. Find reservation
        const reservation = await prisma.reservation.findFirst({
            where: {
                id: reservationId,
                propertyId: context.hotelId
            },
            include: {
                roomType: true
            }
        });

        if (!reservation) {
            return NextResponse.json({
                code: 'NOT_FOUND',
                message: 'Reserva não encontrada'
            }, { status: 404 });
        }

        // 3. Check if can cancel
        if (reservation.status === 'CANCELLED') {
            return NextResponse.json({
                code: 'ALREADY_CANCELLED',
                message: 'Esta reserva já foi cancelada'
            }, { status: 400 });
        }

        if (reservation.status === 'CHECKED_OUT') {
            return NextResponse.json({
                code: 'CANNOT_CANCEL',
                message: 'Não é possível cancelar uma reserva já finalizada'
            }, { status: 400 });
        }

        // 4. Cancel in transaction
        await prisma.$transaction(async (tx) => {
            // Update reservation status
            await tx.reservation.update({
                where: { id: reservationId },
                data: { status: 'CANCELLED' }
            });

            // Return inventory
            await tx.inventory.updateMany({
                where: {
                    propertyId: context.hotelId!,
                    roomTypeId: reservation.roomTypeId,
                    date: {
                        gte: reservation.checkIn,
                        lt: reservation.checkOut
                    }
                },
                data: {
                    available: { increment: 1 },
                    booked: { decrement: 1 }
                }
            });
        });

        // ✅ Audit Log: BOOKING_CANCELLED
        await auditLogService.log({
            eventType: 'BOOKING_CANCELLED',
            aggregateId: reservationId,
            aggregateType: 'Reservation',
            payload: {
                reservationId: reservation.id,
                pnr: reservation.pnr,
                previousStatus: reservation.status,
                newStatus: 'CANCELLED',
                checkIn: reservation.checkIn,
                checkOut: reservation.checkOut
            },
            requestId: context.requestId,
            hotelId: context.hotelId
        });

        return NextResponse.json({
            message: 'Reserva cancelada com sucesso',
            reservation: {
                id: reservation.id,
                pnr: reservation.pnr,
                status: 'CANCELLED'
            }
        });

    } catch (error) {
        console.error('Erro ao cancelar reserva:', error);
        return NextResponse.json({
            code: 'INTERNAL_ERROR',
            message: 'Erro ao processar cancelamento',
            details: (error as Error).message
        }, { status: 500 });
    }
}
