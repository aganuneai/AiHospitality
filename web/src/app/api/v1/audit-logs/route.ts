import { NextRequest, NextResponse } from 'next/server';
import { validateContext, getContext } from '@/lib/context/context';
import { auditLogService } from '@/lib/services/audit-log.service';

export async function GET(req: NextRequest) {
    // 1. Validate Context Headers
    const contextError = validateContext(req);
    if (contextError) return contextError;

    const context = getContext(req);
    const { searchParams } = new URL(req.url);

    // Parse filters from query params
    const filter = {
        hotelId: context.hotelId,
        aggregateId: searchParams.get('aggregateId') || undefined,
        aggregateType: searchParams.get('aggregateType') || undefined,
        eventType: searchParams.get('eventType') || undefined,
        from: searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined,
        to: searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined,
        limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100
    };

    try {
        const events = await auditLogService.getEvents(filter);

        return NextResponse.json({
            events,
            count: events.length,
            filter
        });
    } catch (error) {
        console.error('[AuditLog] Error fetching events:', error);
        return NextResponse.json({
            code: 'INTERNAL_ERROR',
            message: 'Erro ao buscar eventos de auditoria'
        }, { status: 500 });
    }
}
