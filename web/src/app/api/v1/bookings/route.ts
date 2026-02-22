import { NextRequest, NextResponse } from 'next/server';
import { parseContext } from '@/lib/context/context';
import { bookService } from '@/lib/services/book-service';
import { BookRequestSchema } from '@/lib/schemas/booking/booking.schema';
import { withIdempotency } from '@/lib/utils/idempotency';

export async function GET(req: NextRequest) {
    // 1. Context
    const context = parseContext(req);
    // For admin, we might typically require authentication, but for verification we check hotel context
    if (!context || !context.hotelId) {
        return NextResponse.json({ code: 'CONTEXT_INVALID', message: 'ID do hotel não fornecido' }, { status: 400 });
    }

    try {
        const bookings = await bookService.listReservations({ hotelId: context.hotelId });
        return NextResponse.json({ bookings });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ code: 'INTERNAL_ERROR', message: 'Falha ao listar reservas' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    // 1. Context
    const context = parseContext(req);
    if (!context || !context.hotelId) {
        return NextResponse.json({ code: 'CONTEXT_INVALID', message: 'ID do hotel não fornecido' }, { status: 400 });
    }

    // 2. Parse Body to get Idempotency Key first
    let body;
    try {
        body = await req.json();
    } catch (e) {
        return NextResponse.json({ code: 'INVALID_JSON', message: 'Erro ao processar JSON' }, { status: 400 });
    }

    const idempotencyKey = body.idempotencyKey;
    if (!idempotencyKey) {
        return NextResponse.json({ code: 'MISSING_IDEMPOTENCY_KEY', message: 'Chave de idempotência é obrigatória' }, { status: 400 });
    }

    // 3. Wrap with Idempotency
    return withIdempotency(idempotencyKey, 'POST', req.url, async () => {
        // 4. Validate Full Request
        const validation = BookRequestSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Erro de validação', errors: validation.error.format() }, { status: 400 });
        }

        // 5. Execute Service
        try {
            const booking = await bookService.createBooking({
                propertyId: context.hotelId!,
                channelId: 'DIRECT'
            }, validation.data);
            return NextResponse.json({
                booking
            }, { status: 201 });
        } catch (error) {
            console.error(error);
            return NextResponse.json({ code: 'INTERNAL_ERROR', message: 'Erro ao criar reserva', details: (error as Error).message }, { status: 500 });
        }
    });
}
