import { NextRequest, NextResponse } from 'next/server';
import { bookService } from '@/lib/services/book-service';
import { z } from 'zod';

const updateStatusSchema = z.object({
    status: z.enum(['CONFIRMED', 'CANCELLED', 'CHECKED_IN', 'CHECKED_OUT'])
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = (await params).id;
        const body = await req.json();

        const { status } = updateStatusSchema.parse(body);

        const booking = await bookService.updateBookingStatus(id, status);

        return NextResponse.json(booking);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Validation Error', details: (error as any).errors }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
