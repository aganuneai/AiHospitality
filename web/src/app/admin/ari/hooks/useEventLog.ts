import { useState, useEffect } from 'react';

interface AriEvent {
    eventId: string;
    occurredAt: string;
    propertyId: string;
    channelCode: string | null;
    eventType: string;
    roomTypeCode: string;
    ratePlanCode: string | null;
    dateRange: { from: string, to: string };
    payload: Record<string, any>;
    status: string;
    processedAt: string | null;
    createdAt: string;
}

interface UseEventLogOptions {
    status?: string;
    eventType?: string;
    roomTypeCode?: string;
    ratePlanCode?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
}

interface UseEventLogReturn {
    events: AriEvent[];
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

export function useEventLog({
    status,
    eventType,
    roomTypeCode,
    ratePlanCode,
    startDate,
    endDate,
    limit = 50
}: UseEventLogOptions = {}): UseEventLogReturn {
    const [events, setEvents] = useState<AriEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchEvents = async () => {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (status) params.append('status', status);
        if (eventType) params.append('eventType', eventType);
        if (roomTypeCode) params.append('roomTypeCode', roomTypeCode);
        if (ratePlanCode) params.append('ratePlanCode', ratePlanCode);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        params.append('limit', limit.toString());

        try {
            const response = await fetch(`/api/v1/ari/events?${params.toString()}`, {
                headers: {
                    'x-hotel-id': 'HOTEL_001',
                    'x-request-id': `event-log-${Date.now()}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            setEvents(result.events || []);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, [status, eventType, roomTypeCode, ratePlanCode, startDate, endDate, limit]);

    return {
        events,
        loading,
        error,
        refetch: fetchEvents
    };
}
