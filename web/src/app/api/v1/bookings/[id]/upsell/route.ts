import { NextRequest, NextResponse } from 'next/server';
import { upsellService } from '@/lib/services/monetization/upsell.service';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> } // Next.js 15+ dynamic route param type
) {
    try {
        const { id } = await params;
        const offers = await upsellService.generateOffers(id);
        return NextResponse.json({ offers });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const body = await req.json();
        const { offerId } = body;

        if (!offerId) {
            return NextResponse.json({ error: 'Missing offerId' }, { status: 400 });
        }

        const acceptedOffer = await upsellService.acceptOffer(offerId);

        return NextResponse.json({
            success: true,
            offer: acceptedOffer,
            message: 'Upgrade accepted successfully'
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
