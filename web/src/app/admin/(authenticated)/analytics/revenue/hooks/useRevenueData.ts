'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';

interface RevenueDataPoint {
    period: string;
    revenue: number;
    bookings: number;
    adr: number;
    revpar: number;
    roomNights: number;
}

interface RevenueSummary {
    totalRevenue: number;
    totalBookings: number;
    avgAdr: number;
    avgRevpar: number;
    totalRoomNights: number;
}

interface UseRevenueDataReturn {
    revenueData: RevenueDataPoint[];
    summary: RevenueSummary;
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

export function useRevenueData(
    from: Date,
    to: Date,
    groupBy: 'day' | 'week' | 'month' = 'day',
    roomType?: string,
    channelCode?: string
): UseRevenueDataReturn {
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
        to: toStr,
        groupBy
    });

    if (roomType) params.append('roomType', roomType);
    if (channelCode) params.append('channelCode', channelCode);

    const url = `/api/v1/analytics/revenue?${params.toString()}`;

    const { data, error, mutate } = useSWR(
        mounted ? url : null,
        fetcher,
        {
            refreshInterval: 60000, // Refresh every minute
            revalidateOnFocus: false
        }
    );

    return {
        revenueData: data?.data || [],
        summary: data?.summary || {
            totalRevenue: 0,
            totalBookings: 0,
            avgAdr: 0,
            avgRevpar: 0,
            totalRoomNights: 0
        },
        isLoading: !error && !data && mounted,
        error,
        refetch: mutate
    };
}
