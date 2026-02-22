import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { startOfDay, endOfDay, parseISO } from "date-fns";

export const dynamic = 'force-dynamic'; // No caching

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const startParam = searchParams.get('start');
        const endParam = searchParams.get('end');
        const propertyId = "HOTEL_001"; // Hardcoded for MVP

        if (!startParam || !endParam) {
            return NextResponse.json({ error: "Missing start or end date" }, { status: 400 });
        }

        const startDate = startOfDay(parseISO(startParam));
        const endDate = endOfDay(parseISO(endParam));

        // 1. Fetch Physical Rooms (Rows)
        const rooms = await prisma.room.findMany({
            where: { propertyId },
            include: {
                roomType: true,
                maintenance: { // Include maintenance blocks if needed
                    where: {
                        OR: [
                            { startDate: { lte: endDate }, endDate: { gte: startDate } },
                            { startDate: { lte: endDate }, endDate: null } // Ongoing
                        ]
                    }
                }
            },
            orderBy: [
                { roomType: { name: 'asc' } },
                { name: 'asc' }
            ]
        });

        // 2. Fetch Reservations (Blocks)
        // Overlap logic: (StartA <= EndB) and (EndA >= StartB)
        const reservations = await prisma.reservation.findMany({
            where: {
                propertyId,
                status: { not: 'CANCELLED' },
                // Standard overlap check
                checkIn: { lte: endDate },
                checkOut: { gte: startDate }
            },
            select: {
                id: true,
                groupId: true,
                guests: { where: { isRepresentative: true }, select: { name: true }, take: 1 },
                checkIn: true,
                checkOut: true,
                status: true,
                roomTypeId: true,
                roomId: true, // Physical room assignment
                total: true
            }
        });

        // 3. Transform for Grid consumption
        // We need to map unassigned reservations to a "Unassigned" row or handle them in UI
        const gridData = {
            rooms: rooms.map(r => ({
                id: r.id,
                name: r.name,
                type: r.roomType.name,
                typeId: r.roomTypeId,
                status: r.status,
                maintenance: r.maintenance
            })),
            bookings: reservations.map(r => ({
                id: r.id,
                groupId: r.groupId,
                guestName: r.guests[0]?.name || 'Unknown',
                checkIn: r.checkIn,
                checkOut: r.checkOut,
                status: r.status,
                roomId: r.roomId || 'UNASSIGNED', // Important for drag-drop
                roomTypeId: r.roomTypeId
            }))
        };

        return NextResponse.json(gridData);

    } catch (error: any) {
        console.error("Grid Fetch Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
