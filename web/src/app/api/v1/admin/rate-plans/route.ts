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
                parentRatePlanId: parentRatePlanId || null,
                derivedType: derivedType || null,
                derivedValue: derivedValue !== undefined ? Number(derivedValue) : null,
                roundingRule: roundingRule || "NONE"
            }
        });
        return NextResponse.json(ratePlan, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
