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
        const { name, description, parentRatePlanId, derivedType, derivedValue, roundingRule } = body;

        const ratePlan = await prisma.ratePlan.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(parentRatePlanId !== undefined && { parentRatePlanId: parentRatePlanId || null }),
                ...(derivedType !== undefined && { derivedType: derivedType || null }),
                ...(derivedValue !== undefined && { derivedValue: derivedValue !== null ? Number(derivedValue) : null }),
                ...(roundingRule !== undefined && { roundingRule: roundingRule || "NONE" }),
            }
        });
        return NextResponse.json(ratePlan);
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
        await prisma.ratePlan.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
