import { NextRequest, NextResponse } from 'next/server';
import { guestService } from '@/lib/services/guest-service';
import { validateContext, getContext } from '@/lib/context/context';
import { auditLogService } from '@/lib/services/audit-log.service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/admin/guests/[id]
 * Get guest details
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const contextError = validateContext(req);
    if (contextError) return contextError;

    try {
        const guest = await guestService.getById(id);
        if (!guest) {
            return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
        }
        return NextResponse.json(guest);
    } catch (error: any) {
        return NextResponse.json(
            { error: 'Failed to fetch guest details', message: error.message },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/v1/admin/guests/[id]
 * Update guest profile
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const contextError = validateContext(req);
    if (contextError) return contextError;

    const context = getContext(req);

    try {
        const body = await req.json();
        const guest = await guestService.update(id, body);

        // Audit Log
        await auditLogService.log({
            eventType: 'GUEST_PROFILE_UPDATED',
            aggregateId: id,
            aggregateType: 'GuestProfile',
            payload: body,
            requestId: context.requestId,
            hotelId: context.hotelId
        });

        return NextResponse.json(guest);
    } catch (error: any) {
        console.error('[GUEST_UPDATE_ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to update guest profile', message: error.message },
            { status: 500 }
        );
    }
}
