import { useState, useEffect } from 'react';

export interface GuestResult {
    id: string;
    fullName: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    documentId?: string;
    documentType?: string;
    displayText?: string;
    lastUpdated?: string;
}

export function useGuestSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<GuestResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const timeoutId = setTimeout(async () => {
            if (query.length < 2) {
                setResults([]);
                return;
            }

            setIsLoading(true);
            try {
                const res = await fetch(`/api/v1/admin/guests/search?q=${encodeURIComponent(query)}`);
                if (res.ok) {
                    const data = await res.json();
                    setResults(data.guests || []);
                }
            } catch (error) {
                console.error("Search failed", error);
                setResults([]);
            } finally {
                setIsLoading(false);
            }
        }, 300); // Debounce 300ms

        return () => clearTimeout(timeoutId);
    }, [query]);

    return {
        query,
        setQuery,
        results,
        isLoading
    };
}
