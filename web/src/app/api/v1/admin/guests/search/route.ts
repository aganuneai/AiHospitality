import { NextRequest, NextResponse } from 'next/server';
import { guestService } from '@/lib/services/guest-service';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json({ guests: [] });
    }

    try {
        const guests = await guestService.search(query);
        return NextResponse.json({ guests });
    } catch (error) {
        console.error("Guest Search Error:", error);
        return NextResponse.json(
            { error: "Failed to search guests" },
            { status: 500 }
        );
    }
}
