import { useState, useEffect } from 'react';
import { AriCalendarResponse, AriCalendarDay } from '@/lib/types/ari';

interface UseAriCalendarOptions {
    roomTypeCode: string;
    initialDays?: number;
}

interface UseAriCalendarReturn {
    data: AriCalendarResponse | null;
    days: AriCalendarDay[];
    loading: boolean;
    error: string | null;
    currentMonth: Date;
    goToPreviousMonth: () => void;
    goToNextMonth: () => void;
    refetch: () => void;
}

export function useAriCalendar({
    roomTypeCode,
    initialDays = 30
}: UseAriCalendarOptions): UseAriCalendarReturn {
    const [data, setData] = useState<AriCalendarResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const fetchCalendar = async (fromDate: Date, toDate: Date) => {
        setLoading(true);
        setError(null);

        const from = fromDate.toISOString().split('T')[0];
        const to = toDate.toISOString().split('T')[0];

        const url = `/api/v1/ari/calendar?roomType=${encodeURIComponent(roomTypeCode)}&from=${from}&to=${to}`;
        console.log('[useAriCalendar] Fetching:', url);

        try {
            const response = await fetch(url, {
                headers: {
                    'x-hotel-id': 'HOTEL_001',
                    'x-request-id': `calendar-${Date.now()}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }

            const result = await response.json();
            setData(result);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const calculateDateRange = (baseDate: Date) => {
        const from = new Date(baseDate);
        from.setDate(1); // First day of month

        const to = new Date(from);
        to.setMonth(to.getMonth() + 1);
        to.setDate(0); // Last day of month

        return { from, to };
    };

    const goToPreviousMonth = () => {
        setCurrentMonth(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() - 1);
            return newDate;
        });
    };

    const goToNextMonth = () => {
        setCurrentMonth(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + 1);
            return newDate;
        });
    };

    const refetch = () => {
        const { from, to } = calculateDateRange(currentMonth);
        fetchCalendar(from, to);
    };

    // Fetch on mount and when month changes
    useEffect(() => {
        const { from, to } = calculateDateRange(currentMonth);
        fetchCalendar(from, to);
    }, [currentMonth, roomTypeCode]);

    return {
        data,
        days: data?.days || [],
        loading,
        error,
        currentMonth,
        goToPreviousMonth,
        goToNextMonth,
        refetch
    };
}
