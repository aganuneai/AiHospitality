import { NextRequest, NextResponse } from 'next/server';
import { packageService } from '@/lib/services/monetization/package.service';
import { createPackageSchema } from '@/lib/schemas/monetization/package.schema';
import { z } from 'zod';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const data = createPackageSchema.parse(body);

        const pkg = await packageService.createPackage(data);

        return NextResponse.json(pkg, { status: 201 });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Validation Error', details: (error as any).errors }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const propertyId = searchParams.get('propertyId');
        const roomTypeId = searchParams.get('roomTypeId');
        const checkIn = searchParams.get('checkIn');
        const checkOut = searchParams.get('checkOut');

        if (!propertyId || !roomTypeId || !checkIn || !checkOut) {
            return NextResponse.json({ error: 'Missing required query params' }, { status: 400 });
        }

        const packages = await packageService.findAvailablePackages(
            propertyId,
            roomTypeId,
            new Date(checkIn),
            new Date(checkOut)
        );

        return NextResponse.json({ packages });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
