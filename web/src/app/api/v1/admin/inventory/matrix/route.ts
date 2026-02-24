import { NextResponse } from 'next/server';
import { InventoryService } from '@/lib/services/inventory-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const startDateParam = searchParams.get('startDate');
        const hotelId = request.headers.get('x-hotel-id') || 'HOTEL_001';

        const startDate = startDateParam ? new Date(startDateParam) : new Date();
        const inventoryService = new InventoryService();

        const matrix = await inventoryService.getAvailabilityMatrix(hotelId, startDate);

        return NextResponse.json(matrix);
    } catch (error: any) {
        console.error('[INVENTORY_MATRIX_ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch inventory matrix', message: error.message },
            { status: 500 }
        );
    }
}
