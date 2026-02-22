import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureProperty } from "@/lib/utils/ensure-property";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const propertyId = req.headers.get("x-hotel-id") || req.nextUrl.searchParams.get("propertyId") || "HOTEL_001";
        const rooms = await prisma.room.findMany({
            where: { propertyId },
            include: { roomType: { select: { id: true, name: true, code: true } } },
            orderBy: { name: 'asc' }
        });
        return NextResponse.json({ rooms });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const propertyId = req.headers.get("x-hotel-id") || "HOTEL_001";
        const body = await req.json();
        const { name, roomTypeId, status = "CLEAN", tags = [] } = body;

        if (!name || !roomTypeId) {
            return NextResponse.json({ error: "name e roomTypeId são obrigatórios" }, { status: 400 });
        }

        await ensureProperty(propertyId);

        const room = await prisma.room.create({
            data: { propertyId, name, roomTypeId, status, tags },
            include: { roomType: { select: { id: true, name: true, code: true } } }
        });
        return NextResponse.json(room, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
