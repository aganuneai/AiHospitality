/**
 * Bulk ARI API Endpoint
 * 
 * POST /api/v1/ari/bulk
 * 
 * Batch process ARI (Availability, Rates, Inventory) updates.
 */

import { NextRequest, NextResponse } from 'next/server';
import { processBulkARI } from '@/lib/ari/bulk-processor';
import { validateBulkARIRequest } from '@/lib/ari/bulk-validator';
import { getContext } from '@/lib/context/validator';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
    try {
        // Get context
        const context = getContext(req);

        if (!context) {
            return NextResponse.json({
                success: false,
                error: 'MISSING_CONTEXT',
                message: 'Request context not found'
            }, { status: 400 });
        }

        // Parse request body
        const body = await req.json();

        // Validate request
        const validation = validateBulkARIRequest(body);

        if (!validation.valid) {
            return NextResponse.json({
                success: false,
                error: 'VALIDATION_ERROR',
                message: 'Invalid bulk ARI request',
                details: validation.errors
            }, { status: 400 });
        }

        logger.info('Processing bulk ARI request', {
            hotelId: context.hotelId,
            operationCount: body.operations.length
        });

        // Process bulk operations
        const result = await processBulkARI(context.hotelId, body);

        if (!result.success) {
            return NextResponse.json({
                success: false,
                error: 'PARTIAL_FAILURE',
                message: 'Some operations failed',
                processed: result.processed,
                failed: result.failed,
                errors: result.errors,
                duration: result.duration
            }, { status: 207 }); // Multi-status
        }

        return NextResponse.json({
            success: true,
            processed: result.processed,
            failed: result.failed,
            duration: result.duration
        }, { status: 200 });

    } catch (error: any) {
        logger.error('Bulk ARI error', {
            error: error.message,
            stack: error.stack
        });

        return NextResponse.json({
            success: false,
            error: 'BULK_PROCESSING_ERROR',
            message: error.message
        }, { status: 500 });
    }
}
