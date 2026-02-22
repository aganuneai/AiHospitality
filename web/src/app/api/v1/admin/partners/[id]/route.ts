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
        const { name, email, phone, country, commission, contractRef } = body;

        await prisma.$executeRaw`
            UPDATE "Partner"
            SET
                name        = COALESCE(${name ?? null}::text, name),
                email       = COALESCE(${email ?? null}::text, email),
                phone       = COALESCE(${phone ?? null}::text, phone),
                country     = COALESCE(${country ?? null}::text, country),
                commission  = COALESCE(${commission !== undefined ? Number(commission) : null}::numeric, commission),
                "contractRef" = COALESCE(${contractRef ?? null}::text, "contractRef"),
                "updatedAt" = NOW()
            WHERE id = ${id}
        `;

        const updated = await prisma.$queryRaw<any[]>`
            SELECT id, type, name, code, email, phone, country, commission::float, "contractRef", active
            FROM "Partner" WHERE id = ${id}
        `;

        return NextResponse.json(updated[0] ?? { id });
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
        // Soft delete
        await prisma.$executeRaw`
            UPDATE "Partner" SET active = false, "updatedAt" = NOW() WHERE id = ${id}
        `;
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
