import { NextRequest, NextResponse } from 'next/server';
import { validateContext, getContext } from '@/lib/context/context';
import { ariService } from '@/lib/services/ari-service';
import { bulkUpdateSchema } from '@/lib/schemas/ari/bulk-update.schema';

export const dynamic = 'force-dynamic';

/**
 * ARI Bulk Update API Endpoint
 * 
 * POST /api/v1/admin/ari/bulk
 * 
 * Applies bulk modifications to Availability, Rates, and Restrictions 
 * over a specified maximum range of 180 days.
 */
export async function POST(req: NextRequest) {
    // 1. Validate Context (x-hotel-id is mandatory)
    const contextError = validateContext(req);
    if (contextError) return contextError;

    const context = getContext(req);

    try {
        const body = await req.json();

        // 2. Validate payload schema
        const validationResult = bulkUpdateSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                {
                    error: 'Invalid bulk update payload',
                    details: (validationResult as any).error?.errors,
                    code: 'VALIDATION_ERROR'
                },
                { status: 400 }
            );
        }

        const params = validationResult.data;

        // 3. Process the bulk update inside a transaction using AriService
        const result = await ariService.updateBulk(context.hotelId, params);

        return NextResponse.json({
            message: result.message,
            warnings: result.warnings,
            success: true
        });

    } catch (error: any) {
        console.error('[ARI_BULK_UPDATE_ERROR]', {
            hotelId: context.hotelId,
            error: error.message
        });

        return NextResponse.json(
            {
                error: 'Failed to apply ARI bulk updates',
                message: error.message,
                code: 'ARI_BULK_UPDATE_FAILED'
            },
            { status: 500 }
        );
    }
}
