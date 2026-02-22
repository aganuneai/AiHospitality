import { prisma } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export interface IdempotencyRecord {
    key: string;
    requestId: string;
    status: 'PENDING' | 'SUCCESS' | 'FAILED';
    result?: any;
    createdAt: Date;
}

export class IdempotencyService {
    /**
     * Checks if an idempotency key exists.
     * If it exists and is SUCCESS, returns the result.
     * If PENDING, might throw error or return status.
     */
    async get(key: string): Promise<IdempotencyRecord | null> {
        const record = await prisma.idempotencyLog.findUnique({
            where: { key }
        });

        if (!record) return null;

        let status: 'PENDING' | 'SUCCESS' | 'FAILED' = 'SUCCESS';
        if (record.statusCode === 202) status = 'PENDING';
        else if (record.statusCode >= 400) status = 'FAILED';

        return {
            key: record.key,
            requestId: 'UNKNOWN', // Schema doesn't have requestId yet, maybe add it or ignore
            status,
            result: record.response,
            createdAt: record.createdAt
        };
    }

    async lock(key: string, requestId: string): Promise<void> {
        try {
            await prisma.idempotencyLog.create({
                data: {
                    key,
                    method: 'SAGA', // Placeholder
                    path: 'BOOK_SAGA', // Placeholder
                    statusCode: 202, // 202 Accepted = PENDING
                    response: {},
                    createdAt: new Date()
                }
            });
        } catch (e) {
            throw new Error("IDEMPOTENCY_CONFLICT");
        }
    }

    async complete(key: string, result: any): Promise<void> {
        await prisma.idempotencyLog.update({
            where: { key },
            data: {
                statusCode: 201, // Created/Success
                response: result ?? {}
            }
        });
    }

    async fail(key: string, error: any): Promise<void> {
        await prisma.idempotencyLog.update({
            where: { key },
            data: {
                statusCode: 500,
                response: error ?? {}
            }
        });
    }
}
