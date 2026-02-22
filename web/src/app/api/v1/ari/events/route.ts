import { NextRequest, NextResponse } from 'next/server';
import { validateContext, getContext } from '@/lib/context/context';
import { AriEventSchema } from '@/lib/types/ari';
import { ariProcessorService } from '@/lib/services/ari-processor.service';
import { prisma } from '@/lib/db';

/**
 * POST /api/v1/ari/events
 * 
 * Async event ingestion for ARI updates from external channels
 * Events are queued and processed through the ARI saga
 */
export async function POST(req: NextRequest) {
    // 1. Validate Context
    const contextError = validateContext(req);
    if (contextError) return contextError;

    const context = getContext(req);

    // 2. Parse & Validate Body
    let body;
    try {
        body = await req.json();
    } catch (e) {
        return NextResponse.json({
            code: 'INVALID_JSON',
            message: 'Erro ao processar JSON'
        }, { status: 400 });
    }

    const validation = AriEventSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json({
            code: 'VALIDATION_ERROR',
            message: 'Erro de validação',
            errors: validation.error.format()
        }, { status: 400 });
    }

    const event = validation.data;

    try {
        // 3. Process event through saga (async in real implementation)
        // For MVP, we'll process synchronously
        const result = await ariProcessorService.processEvent({
            ...event,
            propertyId: context.hotelId,
            channelCode: context.channelCode
        } as any);

        if (result.success) {
            // Return 202 Accepted for async processing
            return NextResponse.json({
                eventId: result.eventId,
                status: result.status,
                message: 'Event queued for processing'
            }, { status: 202 });
        } else {
            // Return error details
            return NextResponse.json({
                code: 'PROCESSING_FAILED',
                message: result.message,
                eventId: result.eventId,
                status: result.status
            }, { status: result.status === 'DEDUPED' ? 409 : 422 });
        }

    } catch (error) {
        console.error('[ARI Events] Processing error:', error);
        return NextResponse.json({
            code: 'INTERNAL_ERROR',
            message: 'Erro ao processar evento ARI',
            details: (error as Error).message
        }, { status: 500 });
    }
}

/**
 * GET /api/v1/ari/events
 * 
 * List ARI events with filtering
 */
export async function GET(req: NextRequest) {
    const contextError = validateContext(req);
    if (contextError) return contextError;

    const context = getContext(req);
    const { searchParams } = new URL(req.url);

    const status = searchParams.get('status');
    const eventType = searchParams.get('eventType');
    const roomTypeCode = searchParams.get('roomTypeCode');
    const ratePlanCode = searchParams.get('ratePlanCode');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');

    try {
        const events = await prisma.ariEvent.findMany({
            where: {
                propertyId: context.hotelId,
                ...(status && { status }),
                ...(eventType && { eventType }),
                ...(roomTypeCode && { roomTypeCode }),
                ...(ratePlanCode && { ratePlanCode }),
                ...(startDate || endDate ? {
                    occurredAt: {
                        ...(startDate && { gte: new Date(startDate) }),
                        ...(endDate && { lte: new Date(endDate) })
                    }
                } : {})
            },
            orderBy: { occurredAt: 'desc' },
            take: limit
        });

        return NextResponse.json({
            events,
            count: events.length
        });

    } catch (error) {
        console.error('[ARI Events] Fetch error:', error);
        return NextResponse.json({
            code: 'INTERNAL_ERROR',
            message: 'Erro ao buscar eventos',
            details: (error as Error).message
        }, { status: 500 });
    }
}
