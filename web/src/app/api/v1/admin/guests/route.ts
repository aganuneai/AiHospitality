import { NextRequest, NextResponse } from 'next/server';
import { guestService } from '@/lib/services/guest-service';
import { validateContext, getContext } from '@/lib/context/context';
import { auditLogService } from '@/lib/services/audit-log.service';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/admin/guests
 * List guests with pagination
 */
export async function GET(req: NextRequest) {
    const contextError = validateContext(req);
    if (contextError) return contextError;

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;

    try {
        const result = await guestService.list({ limit, offset });
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[GUESTS_LIST_ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch guests', message: error.message },
            { status: 500 }
        );
    }
}

/**
 * POST /api/v1/admin/guests
 * Create a new guest
 */
export async function POST(req: NextRequest) {
    const contextError = validateContext(req);
    if (contextError) return contextError;

    const context = getContext(req);

    try {
        const body = await req.json();

        // Split name (simple logic for now)
        const [firstName, ...rest] = body.fullName.split(' ');
        const lastName = rest.join(' ') || ' ';

        const guest = await guestService.findOrCreate({
            firstName,
            lastName,
            email: body.email,
            phone: body.phone,
            documentId: body.document?.number,
            documentType: body.document?.type
        });

        // Audit Log
        await auditLogService.log({
            eventType: 'GUEST_PROFILE_CREATED',
            aggregateId: guest.id,
            aggregateType: 'GuestProfile',
            payload: body,
            requestId: context.requestId,
            hotelId: context.hotelId
        });

        return NextResponse.json(guest, { status: 201 });
    } catch (error: any) {
        console.error('[GUESTS_CREATE_ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to create guest', message: error.message },
            { status: 500 }
        );
    }
}
