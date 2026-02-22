import { NextRequest, NextResponse } from 'next/server';
import { paymentSplitService } from '@/lib/services/monetization/payment-split.service';
import { createSplitSchema } from '@/lib/schemas/monetization/payment-split.schema';
import { z } from 'zod';

export async function POST(req: NextRequest) {
    try {
        const hotelId = req.headers.get('x-hotel-id') || undefined;
        const body = await req.json();
        const { reservationId, method, payers } = createSplitSchema.parse(body);

        const split = await paymentSplitService.createSplit(reservationId, method, payers, hotelId);

        return NextResponse.json(split, { status: 201 });

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
