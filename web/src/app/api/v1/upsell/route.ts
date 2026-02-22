import { NextRequest, NextResponse } from 'next/server';
import { upsellService } from '@/lib/services/monetization/upsell.service';
// import { prisma } from '@/lib/db'; // Removed direct access
import { createUpsellRuleSchema } from '@/lib/schemas/monetization/upsell.schema';
import { z } from 'zod';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const data = createUpsellRuleSchema.parse(body);

        const rule = await upsellService.createRule(data);

        return NextResponse.json(rule, { status: 201 });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { code: 'VALIDATION_ERROR', message: 'Dados inválidos', errors: (error as any).errors },
                { status: 400 }
            );
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const propertyId = searchParams.get('propertyId');

        if (!propertyId) {
            return NextResponse.json({ error: 'Missing propertyId' }, { status: 400 });
        }

        const rules = await upsellService.findActiveRules(propertyId);

        return NextResponse.json({ rules });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
