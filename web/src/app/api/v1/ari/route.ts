import { NextRequest, NextResponse } from 'next/server';
import { parseContext } from '@/lib/context/context';
import { AriEventSchema } from '@/lib/contracts/ari.schema';
import { ariProcessorService } from '@/lib/services/ari-processor.service';

export async function POST(req: NextRequest) {
    // 1. Validate Context (Headers)
    const context = parseContext(req);

    // Strict Mode: ARI Push usually comes from DISTRIBUTION/CHANNEL
    // We expect headers: x-hotel-id (optional if implicit in channel?), x-domain, x-channel-code
    if (!context || context.domain !== 'DISTRIBUTION' || !context.channelCode) {
        return NextResponse.json({
            code: 'CONTEXT_INVALID',
            message: 'ARI updates must be from DISTRIBUTION domain with channelCode'
        }, { status: 400 });
    }

    // 2. Parse Body with Discriminated Union Schema
    let body;
    try {
        body = await req.json();
    } catch (e) {
        return NextResponse.json({ code: 'INVALID_JSON', message: 'Invalid JSON payload' }, { status: 400 });
    }

    const validation = AriEventSchema.safeParse(body);

    if (!validation.success) {
        return NextResponse.json({
            code: 'VALIDATION_ERROR',
            message: 'Schema validation failed',
            errors: validation.error.format()
        }, { status: 400 });
    }

    const event = validation.data;

    // 3. Process Event
    // We inject the propertyId/channelCode from context into the event processing context
    // The Schema has 'eventId', 'occurredAt' etc. 
    // The Service expects AriProcessorInput which is AriEvent & { propertyId, channelCode }

    // Check if propertyId is provided in Header or Payload?
    // Usually ARI comes for a specific hotel. Header x-hotel-id is best practice in our context.
    if (!context.hotelId) {
        return NextResponse.json({ code: 'CONTEXT_INVALID', message: 'Missing x-hotel-id header' }, { status: 400 });
    }

    try {
        const result = await ariProcessorService.processEvent({
            ...event,
            propertyId: context.hotelId,
            channelCode: context.channelCode
        });

        if (!result.success) {
            // Logic error (e.g. duplicate or invalid room type)
            // We return 422 Unprocessable Entity or 409 Conflict depending on case?
            // Or 200 OK with error result? 
            // Standard is usually 200 OK with success: false in body for async ack, 
            // but here we are synchronous for the handshake.
            // Let's return 400 or 422.
            return NextResponse.json(result, { status: 422 });
        }

        return NextResponse.json(result, { status: 200 });

    } catch (error) {
        console.error('ARI API Error:', error);
        return NextResponse.json({
            code: 'INTERNAL_ERROR',
            message: 'Failed to process ARI event'
        }, { status: 500 });
    }
}
