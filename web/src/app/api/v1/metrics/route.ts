/**
 * Metrics API Endpoint
 * 
 * GET /api/v1/metrics
 * 
 * Returns real-time metrics for monitoring and observability.
 * Production: Should be secured or exposed only to internal networks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { metricsCollector } from '@/lib/observability/metrics';

export async function GET(req: NextRequest) {
    try {
        const metrics = metricsCollector.getMetrics();

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            metrics
        }, { status: 200 });

    } catch (error: any) {
        console.error('Error fetching metrics:', error);

        return NextResponse.json({
            success: false,
            error: 'METRICS_FETCH_ERROR',
            message: error.message
        }, { status: 500 });
    }
}
