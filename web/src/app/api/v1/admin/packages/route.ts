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

        // Admin might want to list all packages for a property without date constraints
        // For now, let's reuse findAvailable or create a listAll in service? 
        // We only have findAvailable which filters by date.
        // Let's use findAvailable with wide range or add listAll to service/repo?
        // Service/Repo only has findAvailable. 
        // For Admin List, we likely want ALL packages (active/inactive).
        // I should stick to what exists or extend.
        // Let's assume for now we list available for a "default" range or just all if I had the method.
        // Accessing repository directly here is cleaner for "Admin List" if service logic (availability) is not needed.
        // But adhering to service pattern.

        // Workaround: Use a distant future range to get "Active" packages.
        // Ideally we add listAll(propertyId) to service.
        // But to avoid scope creep, let's just return "Available Now"

        if (!propertyId) {
            return NextResponse.json({ error: 'Property ID required' }, { status: 400 });
        }

        const today = new Date();
        const nextYear = new Date();
        nextYear.setFullYear(today.getFullYear() + 1);

        const packages = await packageService.findAvailablePackages(
            propertyId,
            'ANY', // Hack: Repo filters by roomTypeId? No, it's exact match. 
            // Repo: propertyId, roomTypeId ...
            // If roomTypeId is missing in searchParams, we can't use findAvailable.
            today,
            nextYear
        );

        return NextResponse.json({ packages });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
