import { NextRequest, NextResponse } from 'next/server';
import { validateContext, getContext } from '@/lib/context/context';
import { ariService } from '@/lib/services/ari-service';
import { parseISO, addDays, startOfDay, endOfDay } from 'date-fns';

export const dynamic = 'force-dynamic';

/**
 * ARI Grid API Endpoint
 * 
 * GET /api/v1/admin/ari/grid
 * 
 * Fetches Availability, Rates, and Inventory data for all room types
 * in a matrix format ready for the management grid.
 */
export async function GET(req: NextRequest) {
    // Accept hotel ID from header OR query param, fallback to HOTEL_001
    const hotelId = req.headers.get('x-hotel-id')
        || req.nextUrl.searchParams.get('hotelId')
        || 'HOTEL_001';

    const { searchParams } = new URL(req.url);

    // 2. Parse Query Params
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');

    // Parse arrays (comma separated or multiple params)
    const roomTypesParam = searchParams.get('roomTypes');
    const ratePlansParam = searchParams.get('ratePlans');

    const roomTypeIds = roomTypesParam ? roomTypesParam.split(',').map(s => s.trim()).filter(Boolean) : undefined;
    const ratePlanCodes = ratePlansParam ? ratePlansParam.split(',').map(s => s.trim()).filter(Boolean) : undefined;

    // Default range: Today to Today + 14 days if not specified
    const fromDate = fromStr ? startOfDay(parseISO(fromStr)) : startOfDay(new Date());
    const toDate = toStr ? endOfDay(parseISO(toStr)) : endOfDay(addDays(fromDate, 14));

    try {
        // 3. Delegate matrix resolution to AriService
        const gridData = await ariService.getGridData(hotelId, fromDate, toDate, roomTypeIds, ratePlanCodes);

        return NextResponse.json(gridData);
    } catch (error: any) {
        console.error('[ARI_GRID_API_ERROR]', {
            hotelId,
            error: error.message
        });

        return NextResponse.json(
            {
                error: 'Failed to fetch ARI grid matrix',
                message: error.message,
                code: 'ARI_GRID_FETCH_FAILED'
            },
            { status: 500 }
        );
    }
}
