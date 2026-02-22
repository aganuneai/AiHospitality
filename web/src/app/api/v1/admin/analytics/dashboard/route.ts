import { NextResponse } from 'next/server';
import { AnalyticsService } from '@/lib/services/analytics-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const hotelId = request.headers.get('x-hotel-id') || '4044680601076201931'; // Fallback to a known ID if missing
        const analyticsService = new AnalyticsService();

        const kpis = await analyticsService.getDashboardSummary(hotelId);

        return NextResponse.json(kpis);
    } catch (error: any) {
        console.error('[DASHBOARD_KPI_ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch dashboard KPIs', message: error.message },
            { status: 500 }
        );
    }
}
