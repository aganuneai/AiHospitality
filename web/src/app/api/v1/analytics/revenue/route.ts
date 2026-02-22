import { NextRequest, NextResponse } from 'next/server';
import { parseContext } from '@/lib/context/context';
import { AnalyticsService } from '@/lib/services/analytics-service';
import { z } from 'zod';

const analyticsService = new AnalyticsService();

// Validation schema
const RevenueQuerySchema = z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    groupBy: z.enum(['day', 'week', 'month']).optional().default('day'),
    roomType: z.string().optional(),
    channelCode: z.string().optional()
});

/**
 * GET /api/v1/analytics/revenue
 * Get revenue analytics data
 */
export async function GET(req: NextRequest) {
    // 1. Context
    const context = parseContext(req);
    if (!context || !context.hotelId) {
        return NextResponse.json(
            { code: 'CONTEXT_INVALID', message: 'ID do hotel não fornecido' },
            { status: 400 }
        );
    }

    try {
        // 2. Parse and validate query params
        const url = new URL(req.url);
        const params = {
            from: url.searchParams.get('from'),
            to: url.searchParams.get('to'),
            groupBy: url.searchParams.get('groupBy') || 'day',
            roomType: url.searchParams.get('roomType') || undefined,
            channelCode: url.searchParams.get('channelCode') || undefined
        };

        const validated = RevenueQuerySchema.parse(params);

        // 3. Convert dates
        const fromDate = new Date(validated.from);
        const toDate = new Date(validated.to);

        // Validate date range
        if (fromDate > toDate) {
            return NextResponse.json(
                { code: 'INVALID_DATE_RANGE', message: 'Data inicial deve ser anterior à data final' },
                { status: 400 }
            );
        }

        // Limit to 90 days
        const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff > 90) {
            return NextResponse.json(
                { code: 'DATE_RANGE_TOO_LARGE', message: 'Período máximo permitido é de 90 dias' },
                { status: 400 }
            );
        }

        // 4. Get revenue data
        const result = await analyticsService.getRevenueData(
            fromDate,
            toDate,
            context.hotelId,
            validated.groupBy as 'day' | 'week' | 'month',
            validated.roomType,
            validated.channelCode
        );

        // 5. Return response
        return NextResponse.json(result);

    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { code: 'VALIDATION_ERROR', message: 'Parâmetros inválidos', errors: (error as any).errors },
                { status: 400 }
            );
        }

        console.error('Revenue analytics error:', error);
        return NextResponse.json(
            { code: 'INTERNAL_ERROR', message: 'Erro ao processar analytics de revenue' },
            { status: 500 }
        );
    }
}
