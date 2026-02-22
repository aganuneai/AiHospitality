import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const propertyId = req.headers.get("x-hotel-id") || "HOTEL_001";
        const body = await req.json();
        const oldRatePlan = await prisma.ratePlan.findUnique({ where: { id } });

        const ratePlan = await prisma.ratePlan.update({
            where: { id },
            data: {
                ...(body.name && { name: body.name }),
                ...(body.description !== undefined && { description: body.description }),
                ...(body.parentRatePlanId !== undefined && {
                    parentRatePlan: body.parentRatePlanId
                        ? { connect: { id: body.parentRatePlanId } }
                        : { disconnect: true }
                }),
                ...(body.derivedType !== undefined && { derivedType: body.derivedType || null }),
                ...(body.derivedValue !== undefined && { derivedValue: body.derivedValue !== null ? Number(body.derivedValue) : null }),
                ...(body.roundingRule !== undefined && { roundingRule: body.roundingRule || "NONE" }),

                // Multi-Occupancy Adults
                ...(body.singleType !== undefined && { singleType: body.singleType }),
                ...(body.singleValue !== undefined && { singleValue: Number(body.singleValue) }),
                ...(body.tripleType !== undefined && { tripleType: body.tripleType }),
                ...(body.tripleValue !== undefined && { tripleValue: Number(body.tripleValue) }),
                ...(body.quadType !== undefined && { quadType: body.quadType }),
                ...(body.quadValue !== undefined && { quadValue: Number(body.quadValue) }),
                ...(body.extraAdultType !== undefined && { extraAdultType: body.extraAdultType }),
                ...(body.extraAdultValue !== undefined && { extraAdultValue: Number(body.extraAdultValue) }),

                // Child Tiers
                ...(body.childTier1Active !== undefined && { childTier1Active: !!body.childTier1Active }),
                ...(body.childTier1MaxAge !== undefined && { childTier1MaxAge: Number(body.childTier1MaxAge) }),
                ...(body.childTier1Price !== undefined && { childTier1Price: Number(body.childTier1Price) }),
                ...(body.childTier2Active !== undefined && { childTier2Active: !!body.childTier2Active }),
                ...(body.childTier2MaxAge !== undefined && { childTier2MaxAge: Number(body.childTier2MaxAge) }),
                ...(body.childTier2Price !== undefined && { childTier2Price: Number(body.childTier2Price) }),
                ...(body.childTier3Active !== undefined && { childTier3Active: !!body.childTier3Active }),
                ...(body.childTier3MaxAge !== undefined && { childTier3MaxAge: Number(body.childTier3MaxAge) }),
                ...(body.childTier3Price !== undefined && { childTier3Price: Number(body.childTier3Price) }),
            }
        });

        // Record Audit Log with changes
        await prisma.auditLog.create({
            data: {
                eventId: `rp-update-${id}-${Date.now()}`,
                eventType: "RATEPLAN_UPDATED",
                aggregateId: id,
                aggregateType: "RatePlan",
                payload: ratePlan as any,
                changes: {
                    before: oldRatePlan,
                    after: ratePlan
                } as any,
                hotelId: propertyId,
                occurredAt: new Date()
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
