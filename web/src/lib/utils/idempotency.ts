import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db'; // Singleton in prod

export async function withIdempotency(
    key: string,
    method: string,
    path: string,
    handler: () => Promise<NextResponse>
): Promise<NextResponse> {
    // 1. Check if key exists
    const existing = await prisma.idempotencyLog.findUnique({
        where: { key },
    });

    if (existing) {
        // Return cached response
        // Note: In a real scenario, we might want to check if the method/path matches strictly
        return NextResponse.json(existing.response, { status: existing.statusCode });
    }

    // 2. Execute handler
    const response = await handler();
    const body = await response.json(); // Careful: cloning the stream might be needed if consumed twice

    // 3. Store result (Success only or idempotent failures)
    if (response.status < 500) {
        try {
            await prisma.idempotencyLog.create({
                data: {
                    key,
                    method,
                    path, // req.url
                    statusCode: response.status,
                    response: body,
                },
            });
        } catch (e) {
            // Handle race condition if inserted in parallel
            console.warn('Idempotency key collision or DB error', e);
        }
    }

    // Return fresh response (re-serialized)
    return NextResponse.json(body, { status: response.status });
}
