import { useState, useEffect } from 'react';
import { differenceInCalendarDays, parseISO, format } from 'date-fns';

export interface Quote {
    quoteId: string;
    pricingSignature: string;
    roomTypeCode: string;
    ratePlanCode: string;
    currency: string;
    total: number;
    breakdown: any[];
}

interface UseQuotesProps {
    checkIn?: Date;
    checkOut?: Date;
    adults: number;
    children: number;
    promoCode?: string;
    hotelId?: string;
}

export function useQuotes({ checkIn, checkOut, adults, children, promoCode, hotelId = 'HOTEL_001' }: UseQuotesProps) {
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Validation: Need both dates
        if (!checkIn || !checkOut) {
            setQuotes([]);
            return;
        }

        // Validation: Dates must be valid and checkOut > checkIn
        const nights = differenceInCalendarDays(checkOut, checkIn);
        if (nights <= 0) {
            setQuotes([]);
            return;
        }

        const fetchQuotes = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch('/api/v1/quotes', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-hotel-id': hotelId
                    },
                    body: JSON.stringify({
                        stay: {
                            checkIn: format(checkIn, 'yyyy-MM-dd'),
                            checkOut: format(checkOut, 'yyyy-MM-dd'),
                        },
                        guests: {
                            adults,
                            children
                        },
                        ratePlanCode: promoCode || 'BAR'
                    })
                });

                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.error || 'Failed to fetch quotes');
                }

                const data = await res.json();
                setQuotes(data.quotes || []);
            } catch (err: any) {
                console.error("Quote Fetch Error:", err);
                setError(err.message);
                setQuotes([]);
            } finally {
                setLoading(false);
            }
        };

        // Debounce? Or just run. Let's run for now.
        const timeoutId = setTimeout(fetchQuotes, 500); // 500ms debounce
        return () => clearTimeout(timeoutId);

    }, [checkIn, checkOut, adults, children, promoCode, hotelId]);

    return { quotes, loading, error };
}
