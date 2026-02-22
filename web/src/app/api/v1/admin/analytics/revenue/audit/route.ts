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

        const audit = await analyticsService.getRevenueAudit(from, to, hotelId);

        return NextResponse.json(audit);
    } catch (error: any) {
        console.error("Revenue Audit API Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch revenue audit" },
            { status: 500 }
        );
    }
}
