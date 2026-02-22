import { NextResponse } from 'next/server';
import { ariService } from '@/lib/services/ari-service';

export async function POST(req: Request) {
    try {
        const hotelId = req.headers.get('x-hotel-id');
        if (!hotelId) return NextResponse.json({ error: 'Missing hotel context' }, { status: 400 });

        const body = await req.json();
        const { eventId } = body;

        if (!eventId) {
            return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
        }

        const result = await ariService.undoBulk(hotelId, eventId);

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
