import { NextRequest, NextResponse } from 'next/server';
import { validateContext, getContext } from '@/lib/context/context';
import { prisma } from '@/lib/db';
import { ariService } from '@/lib/services/ari-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/admin/ari/occupancy-rates
 * 
 * Calculates multi-occupancy rates for a given base price and rate plan.
 */
export async function GET(req: NextRequest) {
    const contextError = validateContext(req);
    if (contextError) return contextError;

    const context = getContext(req);
    const { searchParams } = new URL(req.url);

    const ratePlanId = searchParams.get('ratePlanId');
    const baseRate = parseFloat(searchParams.get('baseRate') || '0');

    if (!ratePlanId) {
        return NextResponse.json({ error: 'ratePlanId is required' }, { status: 400 });
    }

    try {
        const ratePlan = await prisma.ratePlan.findUnique({
            where: { id: ratePlanId, propertyId: context.hotelId }
        });

        if (!ratePlan) {
            return NextResponse.json({ error: 'Rate plan not found' }, { status: 404 });
        }

        const result = await ariService.calculateOccupancyRates(baseRate, ratePlan);

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
