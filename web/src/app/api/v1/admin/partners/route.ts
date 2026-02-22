import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureProperty } from "@/lib/utils/ensure-property";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const propertyId = req.headers.get("x-hotel-id") || req.nextUrl.searchParams.get("propertyId") || "HOTEL_001";

        const partners = await prisma.$queryRaw<any[]>`
            SELECT id, type, name, code, email, phone, country,
                   commission::float, "contractRef", active, "createdAt"
            FROM "Partner"
            WHERE "propertyId" = ${propertyId} AND active = true
            ORDER BY name ASC
        `;
        return NextResponse.json({ partners });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const propertyId = req.headers.get("x-hotel-id") || "HOTEL_001";
        const body = await req.json();
        const { type, name, code, email = null, phone = null, country = null, commission = null, contractRef = null } = body;

        if (!type || !name || !code) {
            return NextResponse.json({ error: "type, name e code são obrigatórios" }, { status: 400 });
        }

        await ensureProperty(propertyId);

        const commissionDecimal = commission !== null ? Number(commission) : null;

        const result = await prisma.$queryRaw<any[]>`
            INSERT INTO "Partner" (id, "propertyId", type, name, code, email, phone, country, commission, "contractRef", active, "createdAt", "updatedAt")
            VALUES (
                gen_random_uuid()::text,
                ${propertyId},
                ${type},
                ${name},
                ${code},
                ${email},
                ${phone},
                ${country},
                ${commissionDecimal}::numeric,
                ${contractRef},
                true,
                NOW(),
                NOW()
            )
            RETURNING id, type, name, code, email, phone, country, commission::float, "contractRef", active
        `;

        return NextResponse.json(result[0], { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
