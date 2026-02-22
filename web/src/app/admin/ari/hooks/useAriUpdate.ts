import { useState } from 'react';

interface UseAriUpdateOptions {
    onSuccess?: () => void;
    onError?: (error: string) => void;
}

interface AvailabilityUpdate {
    roomTypeCode: string;
    dateRange: { from: string; to: string };
    availability: number;
    updateType: 'SET' | 'INCREMENT' | 'DECREMENT';
}

interface RateUpdate {
    roomTypeCode: string;
    dateRange: { from: string; to: string };
    baseRate: number;
}

interface RestrictionUpdate {
    roomTypeCode: string;
    dateRange: { from: string; to: string };
    restrictions: {
        minLOS?: number;
        maxLOS?: number;
        closedToArrival?: boolean;
        closedToDeparture?: boolean;
        closed?: boolean;
    };
}

export function useAriUpdate({ onSuccess, onError }: UseAriUpdateOptions = {}) {
    const [loading, setLoading] = useState(false);

    const updateAvailability = async (data: AvailabilityUpdate) => {
        setLoading(true);
        try {
            const response = await fetch('/api/v1/ari/availability', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-hotel-id': 'HOTEL_001',
                    'x-request-id': `availability-${Date.now()}`
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to update availability');
            }

            onSuccess?.();
        } catch (err) {
            onError?.((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const updateRate = async (data: RateUpdate) => {
        setLoading(true);
        try {
            const response = await fetch('/api/v1/ari/rates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-hotel-id': 'HOTEL_001',
                    'x-request-id': `rate-${Date.now()}`
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to update rate');
            }

            onSuccess?.();
        } catch (err) {
            onError?.((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const updateRestrictions = async (data: RestrictionUpdate) => {
        setLoading(true);
        try {
            const response = await fetch('/api/v1/ari/restrictions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-hotel-id': 'HOTEL_001',
                    'x-request-id': `restriction-${Date.now()}`
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to update restrictions');
            }

            onSuccess?.();
        } catch (err) {
            onError?.((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return {
        updateAvailability,
        updateRate,
        updateRestrictions,
        loading
    };
}
