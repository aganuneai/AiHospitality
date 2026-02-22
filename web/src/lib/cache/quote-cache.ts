// import { LRUCache } from 'lru-cache';
import { QuoteResult } from '@/lib/schemas/pricing/quote.schema';

interface CacheEntry {
    quotes: any[];
    timestamp: number;
}

const TTL = 5 * 60 * 1000; // 5 minutos em ms

// MOCK CACHE for debugging
const quoteCache = new Map<string, any>();
// const quoteCache = new LRUCache<string, CacheEntry>({
//     max: 100,
//     ttl: TTL,
//     updateAgeOnGet: false,
//     updateAgeOnHas: false
// });

/**
 * Gera chave de cache baseada nos parâmetros da cotação
 */
export function generateCacheKey(params: {
    hotelId: string;
    checkIn: string;
    checkOut: string;
    adults: number;
    children: number;
    roomTypes?: string[];
}): string {
    const roomTypesStr = params.roomTypes?.sort().join(',') || 'all';
    return `${params.hotelId}:${params.checkIn}:${params.checkOut}:${params.adults}:${params.children}:${roomTypesStr}`;
}

/**
 * Busca cotação no cache
 */
export function getCachedQuote(key: string): any[] | null {
    const entry = quoteCache.get(key);

    if (!entry) {
        return null;
    }

    // Verificar se ainda está válido
    if (Date.now() - entry.timestamp > TTL) {
        quoteCache.delete(key);
        return null;
    }

    return entry.quotes;
}

/**
 * Salva cotação no cache
 */
export function setCachedQuote(key: string, quotes: any[]): void {
    quoteCache.set(key, {
        quotes,
        timestamp: Date.now()
    });
}

/**
 * Limpa todo o cache de cotações
 */
export function clearQuoteCache(): void {
    quoteCache.clear();
}

/**
 * Invalida cache para um hotel específico
 */
export function invalidateHotelCache(hotelId: string): void {
    const keys = Array.from(quoteCache.keys());
    keys.forEach((key) => {
        if (typeof key === 'string' && key.startsWith(`${hotelId}:`)) {
            quoteCache.delete(key);
        }
    });
}

/**
 * Retorna estatísticas do cache
 */
/**
 * Busca cotação específica por ID no cache (Scan)
 * Nota: O(N) onde N é o tamanho do cache (max 100). Aceitável para MVP.
 */
export function getQuoteById(quoteId: string): any | null {
    // Map iterator (entries)
    for (const [key, value] of quoteCache.entries()) {
        const entry = value as CacheEntry;

        // Check TTL
        if (Date.now() - entry.timestamp > TTL) continue;

        const found = entry.quotes.find((q: any) => q.quoteId === quoteId);
        if (found) return found;
    }
    return null;
}

export function getCacheStats() {
    return {
        size: quoteCache.size,
        maxSize: 100,
        ttl: TTL
    };
}
