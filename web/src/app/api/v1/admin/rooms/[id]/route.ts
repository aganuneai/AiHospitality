import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { name, roomTypeId, status, tags } = body;

        const room = await prisma.room.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(roomTypeId && { roomTypeId }),
                ...(status && { status }),
                ...(tags !== undefined && { tags }),
            },
            include: { roomType: { select: { id: true, name: true, code: true } } }
        });
        return NextResponse.json(room);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await prisma.room.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
