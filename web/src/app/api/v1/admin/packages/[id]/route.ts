import { NextRequest, NextResponse } from 'next/server';
import { packageService } from '@/lib/services/monetization/package.service';
import { createPackageSchema } from '@/lib/schemas/monetization/package.schema'; // Reuse create schema or make update schema? 
// Ideally we iterate Partial<Create> validation, but for now let's use the same schema partially or just pass body.
// PackageService update takes Partial<CreatePackageInput>.
import { z } from 'zod';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = (await params).id;
        const pkg = await packageService.findPackageById(id);

        if (!pkg) {
            return NextResponse.json({ error: 'Package not found' }, { status: 404 });
        }

        return NextResponse.json(pkg);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = (await params).id;
        const body = await req.json();

        // Validation: We might want a specific UpdateSchema, but for now allow partial updates
        // passed directly to service which types it as Partial<CreateInput>.
        // Ideally: Use Zod partial().
        const updateData = createPackageSchema.partial().parse(body);

        const updatedPkg = await packageService.updatePackage(id, updateData);

        return NextResponse.json(updatedPkg);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Validation Error', details: (error as any).errors }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = (await params).id;
        await packageService.deletePackage(id);
        return NextResponse.json({ message: 'Package deleted successfully' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
