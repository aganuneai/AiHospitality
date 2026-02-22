import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureProperty } from "@/lib/utils/ensure-property";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const propertyId = req.headers.get("x-hotel-id") || req.nextUrl.searchParams.get("propertyId") || "HOTEL_001";
        const roomTypes = await prisma.roomType.findMany({
            where: { propertyId },
            select: { id: true, name: true, code: true, description: true, maxAdults: true, maxChildren: true }
        });
        return NextResponse.json(roomTypes);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const propertyId = req.headers.get("x-hotel-id") || "HOTEL_001";
        const body = await req.json();
        const { code, name, description, maxAdults = 2, maxChildren = 0 } = body;

        if (!code || !name) {
            return NextResponse.json({ error: "code e name são obrigatórios" }, { status: 400 });
        }

        await ensureProperty(propertyId);

        const roomType = await prisma.roomType.create({
            data: { propertyId, code, name, description, maxAdults: Number(maxAdults), maxChildren: Number(maxChildren) }
        });
        return NextResponse.json(roomType, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
