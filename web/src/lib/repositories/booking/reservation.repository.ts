import { prisma } from '@/lib/db';
import { Reservation, Prisma } from '@prisma/client';
import { differenceInCalendarDays } from 'date-fns';

export interface CreateReservationInput {
    id: string;
    pnr: string;
    propertyId: string;
    guestId: string;
    roomTypeId: string;
    ratePlanCode: string;
    checkIn: Date;
    checkOut: Date;
    adults: number;
    children: number;
    totalAmount: number;
    currency: string;
}

export class ReservationRepository {

    async createWithInventory(
        data: CreateReservationInput & { guests?: any[] },
        inventoryChecks: {
            propertyId: string,
            roomTypeId: string,
            checkIn: Date,
            checkOut: Date,
            quantity: number
        },
        externalTx?: Prisma.TransactionClient
    ): Promise<Reservation> {
        const execute = async (tx: Prisma.TransactionClient) => {
            // 1. Decrement Inventory
            const { count } = await tx.inventory.updateMany({
                where: {
                    propertyId: inventoryChecks.propertyId,
                    roomTypeId: inventoryChecks.roomTypeId,
                    date: {
                        gte: inventoryChecks.checkIn,
                        lt: inventoryChecks.checkOut
                    },
                    available: { gte: inventoryChecks.quantity } // Optimistic lock: only update if available
                },
                data: {
                    available: { decrement: inventoryChecks.quantity },
                    booked: { increment: inventoryChecks.quantity }
                }
            });

            // Verify if all nights were updated. If not, rollback (throw error)
            const expectedNights = differenceInCalendarDays(inventoryChecks.checkOut, inventoryChecks.checkIn);
            if (count !== expectedNights) throw new Error("Inventory unavailable for one or more nights");

            // 2. Create Reservation
            const reservation = await tx.reservation.create({
                data: {
                    id: data.id,
                    pnr: data.pnr,
                    propertyId: data.propertyId,
                    guestId: data.guestId,
                    status: 'CONFIRMED',
                    checkIn: data.checkIn,
                    checkOut: data.checkOut,
                    adults: data.adults,
                    children: data.children,
                    roomTypeId: data.roomTypeId,
                    ratePlanCode: data.ratePlanCode,
                    total: { amount: data.totalAmount, currency: data.currency }
                }
            });

            // 2.1 Create Guests (Occupants)
            if (data.guests && data.guests.length > 0) {
                await tx.reservationGuest.createMany({
                    data: data.guests.map(g => ({
                        reservationId: reservation.id,
                        name: g.name,
                        type: g.type,
                        age: g.age,
                        isRepresentative: g.isRepresentative
                    }))
                });
            } else {
                // Create default representative
                await tx.reservationGuest.create({
                    data: {
                        reservationId: reservation.id,
                        name: "Guest 1",
                        type: "ADULT",
                        isRepresentative: true
                    }
                });
            }

            // 3. Create Folio
            await tx.folio.create({
                data: {
                    reservationId: reservation.id,
                    status: 'OPEN',
                    totals: {
                        base: data.totalAmount,
                        taxes: 0,
                        fees: 0,
                        total: data.totalAmount
                    }
                }
            });

            return reservation;
        };

        if (externalTx) {
            return execute(externalTx);
        } else {
            return prisma.$transaction(execute);
        }
    }

    async findById(id: string): Promise<Reservation | null> {
        return prisma.reservation.findUnique({
            where: { id },
            include: { guest: true, roomType: true, folio: true }
        });
    }

    async findByProperty(propertyId: string): Promise<Reservation[]> {
        return prisma.reservation.findMany({
            where: { propertyId },
            include: { guest: true, roomType: true },
            orderBy: { createdAt: 'desc' }
        });
    }

    async updateStatus(id: string, status: 'CONFIRMED' | 'CANCELLED' | 'CHECKED_IN' | 'CHECKED_OUT') {
        return prisma.reservation.update({
            where: { id },
            data: { status }
        });
    }
}

export const reservationRepository = new ReservationRepository();
