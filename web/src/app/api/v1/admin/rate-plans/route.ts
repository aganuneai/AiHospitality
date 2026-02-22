import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureProperty } from "@/lib/utils/ensure-property";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const propertyId = req.headers.get("x-hotel-id") || req.nextUrl.searchParams.get("propertyId") || "HOTEL_001";
        const ratePlans = await prisma.ratePlan.findMany({
            where: { propertyId },
            orderBy: { code: 'asc' }
        });
        return NextResponse.json({ ratePlans });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const propertyId = req.headers.get("x-hotel-id") || "HOTEL_001";
        const body = await req.json();
        const { code, name, description, parentRatePlanId, derivedType, derivedValue, roundingRule } = body;

        if (!code || !name) {
            return NextResponse.json({ error: "code e name são obrigatórios" }, { status: 400 });
        }

        await ensureProperty(propertyId);

        const ratePlan = await prisma.ratePlan.create({
            data: {
                propertyId,
                code,
                name,
                description,
                ...(parentRatePlanId && { parentRatePlan: { connect: { id: parentRatePlanId } } }),
                derivedType: derivedType || null,
                derivedValue: derivedValue !== undefined ? Number(derivedValue) : null,
                roundingRule: roundingRule || "NONE",
                // Multi-Occupancy Adults
                singleType: body.singleType || "PERCENTAGE",
                singleValue: body.singleValue !== undefined ? Number(body.singleValue) : 0,
                tripleType: body.tripleType || "PERCENTAGE",
                tripleValue: body.tripleValue !== undefined ? Number(body.tripleValue) : 0,
                quadType: body.quadType || "PERCENTAGE",
                quadValue: body.quadValue !== undefined ? Number(body.quadValue) : 0,
                extraAdultType: body.extraAdultType || "FIXED_AMOUNT",
                extraAdultValue: body.extraAdultValue !== undefined ? Number(body.extraAdultValue) : 0,
                // Child Tiers
                childTier1Active: !!body.childTier1Active,
                childTier1MaxAge: body.childTier1MaxAge !== undefined ? Number(body.childTier1MaxAge) : 0,
                childTier1Price: body.childTier1Price !== undefined ? Number(body.childTier1Price) : 0,
                childTier2Active: !!body.childTier2Active,
                childTier2MaxAge: body.childTier2MaxAge !== undefined ? Number(body.childTier2MaxAge) : 5,
                childTier2Price: body.childTier2Price !== undefined ? Number(body.childTier2Price) : 0,
                childTier3Active: !!body.childTier3Active,
                childTier3MaxAge: body.childTier3MaxAge !== undefined ? Number(body.childTier3MaxAge) : 12,
                childTier3Price: body.childTier3Price !== undefined ? Number(body.childTier3Price) : 0,
            }
        });

        // Record Audit Log
        await prisma.auditLog.create({
            data: {
                eventId: `rp-create-${ratePlan.id}-${Date.now()}`,
                eventType: "RATEPLAN_CREATED",
                aggregateId: ratePlan.id,
                aggregateType: "RatePlan",
                payload: ratePlan as any,
                hotelId: propertyId,
                occurredAt: new Date()
            }
        });
        return NextResponse.json(ratePlan, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
