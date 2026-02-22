import { NextRequest, NextResponse } from 'next/server';
import { parseContext } from '@/lib/context/context';
import { QuoteService } from '@/lib/services/quote-service';
import { QuoteRequestSchema } from '@/lib/schemas/pricing/quote.schema';
import { generateCacheKey, getCachedQuote, setCachedQuote } from '@/lib/cache/quote-cache';
import { logger } from '@/lib/logger';

const quoteService = new QuoteService();

export async function POST(req: NextRequest) {
    const startTime = Date.now();

    // 1. Context (Validated by Middleware, but safe to parse again for typed usage)
    const context = parseContext(req);
    if (!context || !context.hotelId) { // Quotes require Property Context
        return NextResponse.json({ code: 'CONTEXT_INVALID', message: 'ID do hotel não fornecido' }, { status: 400 });
    }

    // 2. Parse Body
    let body;
    try {
        body = await req.json();
    } catch (e) {
        return NextResponse.json({ code: 'INVALID_JSON', message: 'Erro ao processar JSON' }, { status: 400 });
    }

    // 3. Validate
    const validation = QuoteRequestSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json({
            code: 'VALIDATION_ERROR',
            message: 'Erro de validação',
            details: validation.error.format()
        }, { status: 400 });
    }

    const request = validation.data;

    try {
        // 4. Check cache
        const cacheKey = generateCacheKey({
            hotelId: context.hotelId,
            checkIn: request.stay.checkIn,
            checkOut: request.stay.checkOut,
            adults: request.guests.adults,
            children: request.guests.children,
            roomTypes: request.roomTypeCodes
        });

        const cachedQuotes = getCachedQuote(cacheKey);

        if (cachedQuotes) {
            logger.info('Cache hit', { cacheKey });
            logger.info('Request completed', {
                method: 'POST',
                url: '/api/v1/quotes',
                hotelId: context.hotelId,
                duration: Date.now() - startTime,
                cached: true
            });

            return NextResponse.json({ quotes: cachedQuotes, cached: true });
        }

        logger.info('Cache miss', { cacheKey });

        // 5. Generate quotes
        const quotes = await quoteService.generateQuotes(context, request);

        // 6. Save to cache
        setCachedQuote(cacheKey, quotes);
        logger.info('Cache set', { cacheKey });

        const duration = Date.now() - startTime;
        logger.info('Request completed', {
            method: 'POST',
            url: '/api/v1/quotes',
            hotelId: context.hotelId,
            duration,
            cached: false
        });

        return NextResponse.json({ quotes, cached: false });
    } catch (error) {
        logger.error('Error processing quote', {
            hotelId: context.hotelId,
            request: body,
            error: (error as Error).message
        });

        return NextResponse.json({
            code: 'INTERNAL_ERROR',
            message: 'Erro ao processar cotação',
            details: (error as Error).message
        }, { status: 500 });
    }
}
