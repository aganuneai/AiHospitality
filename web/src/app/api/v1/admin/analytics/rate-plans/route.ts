import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsService } from '@/lib/services/analytics-service';

const analyticsService = new AnalyticsService();

export async function GET(req: NextRequest) {
    const hotelId = req.headers.get('x-hotel-id') || 'HOTEL_001';
    const { searchParams } = new URL(req.url);

    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');

    if (!fromStr || !toStr) {
        return NextResponse.json(
            { error: "Date range (from, to) is required" },
            { status: 400 }
        );
    }

    try {
        const from = new Date(fromStr);
        const to = new Date(toStr);

        const performance = await analyticsService.getRatePlanPerformance(from, to, hotelId);

        return NextResponse.json(performance);
    } catch (error: any) {
        console.error("Rate Plan Performance API Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch rate plan performance" },
            { status: 500 }
        );
    }
}
