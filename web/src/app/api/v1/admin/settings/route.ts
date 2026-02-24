import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { headers } from 'next/headers';

export async function GET() {
    try {
        const headersList = await headers();
        const hotelId = headersList.get('x-hotel-id') || 'HOTEL_001';

        const property = await prisma.property.findUnique({
            where: { id: hotelId },
            select: {
                id: true,
                name: true,
                code: true,
                description: true,
                email: true,
                phone: true,
                address: true,
                metadata: true,
            }
        });

        if (!property) {
            return NextResponse.json({ error: 'Property not found' }, { status: 404 });
        }

        return NextResponse.json(property);
    } catch (error: any) {
        console.error('Error fetching settings:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const headersList = await headers();
        const hotelId = headersList.get('x-hotel-id') || 'HOTEL_001';
        const data = await req.json();

        const updated = await prisma.property.update({
            where: { id: hotelId },
            data: {
                name: data.name,
                description: data.description,
                email: data.email,
                phone: data.phone,
                address: data.address,
                metadata: data.metadata || {},
            }
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error('Error updating settings:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
