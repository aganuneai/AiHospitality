import { LRUCache } from 'lru-cache';

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

const rateLimitCache = new LRUCache<string, RateLimitEntry>({
    max: 500,
    ttl: 60 * 1000, // 1 minuto
});

export interface RateLimitConfig {
    limit: number; // Número máximo de requisições
    window: number; // Janela de tempo em ms
}

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    reset: number;
}

/**
 * Verifica se a requisição está dentro do rate limit
 */
export function checkRateLimit(
    identifier: string,
    config: RateLimitConfig = { limit: 100, window: 60 * 1000 }
): RateLimitResult {
    const now = Date.now();
    const entry = rateLimitCache.get(identifier);

    // Se não existe entry ou expirou
    if (!entry || entry.resetTime < now) {
        const newEntry: RateLimitEntry = {
            count: 1,
            resetTime: now + config.window
        };
        rateLimitCache.set(identifier, newEntry);

        return {
            allowed: true,
            remaining: config.limit - 1,
            reset: newEntry.resetTime
        };
    }

    // Se já atingiu o limite
    if (entry.count >= config.limit) {
        return {
            allowed: false,
            remaining: 0,
            reset: entry.resetTime
        };
    }

    // Incrementa contador
    entry.count++;
    rateLimitCache.set(identifier, entry);

    return {
        allowed: true,
        remaining: config.limit - entry.count,
        reset: entry.resetTime
    };
}

/**
 * Limpa rate limit para um identificador específico
 */
export function clearRateLimit(identifier: string): void {
    rateLimitCache.delete(identifier);
}

/**
 * Retorna estatísticas do rate limiter
 */
export function getRateLimitStats() {
    return {
        size: rateLimitCache.size,
        maxSize: rateLimitCache.max
    };
}
