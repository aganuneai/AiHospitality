'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';

interface OccupancyDataPoint {
    date: string;
    totalRooms: number;
    bookedRooms: number;
    occupancyRate: number;
    availableRooms: number;
}

interface OccupancySummary {
    avgOccupancy: number;
    peakOccupancy: number;
    peakDate: string;
    lowestOccupancy: number;
    lowestDate: string;
}

interface UseOccupancyDataReturn {
    occupancyData: OccupancyDataPoint[];
    summary: OccupancySummary;
    isLoading: boolean;
    error: any;
    refetch: () => void;
}

const fetcher = (url: string) =>
    fetch(url, {
        headers: {
            'x-hotel-id': 'hotel123'
        }
    }).then((res) => res.json());

export function useOccupancyData(
    from: Date,
    to: Date,
    roomType?: string
): UseOccupancyDataReturn {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Format dates to YYYY-MM-DD
    const fromStr = from.toISOString().split('T')[0];
    const toStr = to.toISOString().split('T')[0];

    // Build URL
    const params = new URLSearchParams({
        from: fromStr,
        to: toStr
    });

    if (roomType) params.append('roomType', roomType);

    const url = `/api/v1/analytics/occupancy?${params.toString()}`;

    const { data, error, mutate } = useSWR(
        mounted ? url : null,
        fetcher,
        {
            refreshInterval: 60000, // Refresh every minute
            revalidateOnFocus: false
        }
    );

    return {
        occupancyData: data?.data || [],
        summary: data?.summary || {
            avgOccupancy: 0,
            peakOccupancy: 0,
            peakDate: '',
            lowestOccupancy: 0,
            lowestDate: ''
        },
        isLoading: !error && !data && mounted,
        error,
        refetch: mutate
    };
}
