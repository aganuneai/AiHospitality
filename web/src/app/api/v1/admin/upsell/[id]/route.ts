import { NextRequest, NextResponse } from 'next/server';
import { upsellService } from '@/lib/services/monetization/upsell.service';
import { createUpsellRuleSchema } from '@/lib/schemas/monetization/upsell.schema';
import { z } from 'zod';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = (await params).id;
        const rule = await upsellService.findRuleById(id);

        if (!rule) {
            return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
        }

        return NextResponse.json(rule);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = (await params).id;
        const body = await req.json();
        const updateData = createUpsellRuleSchema.partial().parse(body);

        const updatedRule = await upsellService.updateRule(id, updateData);

        return NextResponse.json(updatedRule);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Validation Error', details: (error as any).errors }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = (await params).id;
        await upsellService.deleteRule(id);
        return NextResponse.json({ message: 'Rule deleted successfully' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
