import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCacheStats } from '@/lib/cache/quote-cache';

interface HealthCheck {
    status: 'ok' | 'error' | 'degraded';
    latency?: number;
    message?: string;
    [key: string]: any;
}

export async function GET() {
    const startTime = Date.now();

    // Run all checks
    const checks = {
        database: await checkDatabase(),
        cache: checkCache(),
        memory: checkMemory(),
        uptime: checkUptime()
    };

    const isHealthy = checks.database.status === 'ok';
    const isDegraded = Object.values(checks).some(c => c.status === 'degraded');

    return NextResponse.json({
        status: isHealthy ? (isDegraded ? 'degraded' : 'healthy') : 'unhealthy',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        checks,
        version: process.env.npm_package_version || '1.0.0'
    }, { status: isHealthy ? 200 : 503 });
}

async function checkDatabase(): Promise<HealthCheck> {
    try {
        const start = Date.now();
        await prisma.$queryRaw`SELECT 1 as health`;
        const latency = Date.now() - start;

        return {
            status: latency < 100 ? 'ok' : 'degraded',
            latency,
            message: latency < 100 ? 'Database responsive' : 'Database slow'
        };
    } catch (e) {
        return {
            status: 'error',
            message: (e as Error).message
        };
    }
}

function checkCache(): HealthCheck {
    try {
        const stats = getCacheStats();
        return {
            status: 'ok',
            ...stats
        };
    } catch (e) {
        return {
            status: 'degraded',
            message: 'Cache unavailable'
        };
    }
}

function checkMemory(): HealthCheck {
    const usage = process.memoryUsage();
    const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
    const heapPercentage = Math.round((usage.heapUsed / usage.heapTotal) * 100);

    return {
        status: heapPercentage < 90 ? 'ok' : 'degraded',
        heapUsedMB,
        heapTotalMB,
        heapPercentage
    };
}

function checkUptime(): HealthCheck {
    const uptimeSeconds = Math.round(process.uptime());
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);

    return {
        status: 'ok',
        uptimeSeconds,
        uptime: `${hours}h ${minutes}m`
    };
}
