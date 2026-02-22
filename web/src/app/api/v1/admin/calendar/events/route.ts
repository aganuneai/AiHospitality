import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * API Route for Managing Calendar Events
 * POST: Create a new event
 * GET: List events for a property
 */

export async function POST(req: Request) {
    try {
        const hotelId = req.headers.get('x-hotel-id');
        if (!hotelId) return NextResponse.json({ error: 'Missing hotel context' }, { status: 400 });

        const body = await req.json();
        const { title, date, type, color, description } = body;

        if (!title || !date) {
            return NextResponse.json({ error: 'Title and Date are required' }, { status: 400 });
        }

        const dateObj = new Date(date + 'T00:00:00Z');

        let event;
        if ((prisma as any).calendarEvent) {
            event = await (prisma as any).calendarEvent.create({
                data: {
                    propertyId: hotelId,
                    date: dateObj,
                    title,
                    type: type || 'EVENT',
                    color: color || '#3b82f6',
                    description
                }
            });
        } else {
            // Fallback to Raw Query
            await prisma.$executeRaw`
                INSERT INTO "CalendarEvent" (id, "propertyId", date, title, type, color, description, "createdAt", "updatedAt")
                VALUES (gen_random_uuid(), ${hotelId}, ${dateObj}::date, ${title}, ${type || 'EVENT'}, ${color || '#3b82f6'}, ${description}, NOW(), NOW())
            `;
            event = { message: 'Event created via raw fallback' };
        }

        return NextResponse.json(event);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const hotelId = req.headers.get('x-hotel-id');
        if (!hotelId) return NextResponse.json({ error: 'Missing hotel context' }, { status: 400 });

        const { searchParams } = new URL(req.url);
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        let events: any[] = [];
        if ((prisma as any).calendarEvent) {
            const where: any = {
                OR: [
                    { propertyId: hotelId },
                    { propertyId: null }
                ]
            };

            if (from && to) {
                where.date = { gte: new Date(from), lte: new Date(to) };
            }

            events = await (prisma as any).calendarEvent.findMany({
                where,
                orderBy: { date: 'asc' }
            });
        } else {
            // Fallback to Raw Query
            if (from && to) {
                events = await prisma.$queryRaw`
                    SELECT * FROM "CalendarEvent" 
                    WHERE ("propertyId" = ${hotelId} OR "propertyId" IS NULL) 
                    AND "date" >= ${from}::date 
                    AND "date" <= ${to}::date 
                    ORDER BY "date" ASC
                `;
            } else {
                events = await prisma.$queryRaw`
                    SELECT * FROM "CalendarEvent" 
                    WHERE ("propertyId" = ${hotelId} OR "propertyId" IS NULL) 
                    ORDER BY "date" ASC
                `;
            }
        }

        return NextResponse.json(events);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}


export async function PUT(req: Request) {
    try {
        const hotelId = req.headers.get('x-hotel-id');
        if (!hotelId) return NextResponse.json({ error: 'Missing hotel context' }, { status: 400 });

        const body = await req.json();
        const { id, title, date, type, color, description } = body;

        if (!id || !title || !date) {
            return NextResponse.json({ error: 'ID, Title and Date are required' }, { status: 400 });
        }

        const dateObj = new Date(date + 'T00:00:00Z');

        // Verify ownership
        if ((prisma as any).calendarEvent) {
            const existing = await (prisma as any).calendarEvent.findUnique({ where: { id } });
            if (!existing || existing.propertyId !== hotelId) {
                return NextResponse.json({ error: 'Unauthorized or event not found' }, { status: 403 });
            }

            const event = await (prisma as any).calendarEvent.update({
                where: { id },
                data: {
                    date: dateObj,
                    title,
                    type: type || 'EVENT',
                    color: color || '#3b82f6',
                    description,
                    updatedAt: new Date()
                }
            });
            return NextResponse.json(event);
        } else {
            // Fallback to Raw Query
            const results: any[] = await prisma.$queryRaw`SELECT "propertyId" FROM "CalendarEvent" WHERE id = ${id}`;
            if (results.length === 0 || results[0].propertyId !== hotelId) {
                return NextResponse.json({ error: 'Unauthorized or event not found' }, { status: 403 });
            }

            await prisma.$executeRaw`
                UPDATE "CalendarEvent" 
                SET date = ${dateObj}::date, title = ${title}, type = ${type || 'EVENT'}, color = ${color || '#3b82f6'}, description = ${description}, "updatedAt" = NOW()
                WHERE id = ${id}
            `;
            return NextResponse.json({ message: 'Event updated via raw fallback' });
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const hotelId = req.headers.get('x-hotel-id');
        if (!hotelId) return NextResponse.json({ error: 'Missing hotel context' }, { status: 400 });

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'Missing event ID' }, { status: 400 });

        if ((prisma as any).calendarEvent) {
            const event = await (prisma as any).calendarEvent.findUnique({ where: { id } });
            if (!event || event.propertyId !== hotelId) {
                return NextResponse.json({ error: 'Unauthorized or event not found' }, { status: 403 });
            }
            await (prisma as any).calendarEvent.delete({ where: { id } });
        } else {
            // Fallback to Raw Query
            const results: any[] = await prisma.$queryRaw`SELECT "propertyId" FROM "CalendarEvent" WHERE id = ${id}`;
            if (results.length === 0 || results[0].propertyId !== hotelId) {
                return NextResponse.json({ error: 'Unauthorized or event not found' }, { status: 403 });
            }
            await prisma.$executeRaw`DELETE FROM "CalendarEvent" WHERE id = ${id}`;
        }

        return NextResponse.json({ message: 'Event deleted' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
