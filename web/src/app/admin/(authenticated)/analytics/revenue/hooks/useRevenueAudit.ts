'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';

interface UseRevenueAuditReturn {
    auditData: {
        categories: Record<string, number>;
        items: any[];
        summary: {
            totalRevenue: number;
            folioCount: number;
            transactionCount: number;
        };
    } | null;
    isLoading: boolean;
    error: any;
    refetch: () => void;
}

const fetcher = (url: string) =>
    fetch(url, {
        headers: {
            'x-hotel-id': 'HOTEL_001' // Standard test ID
        }
    }).then((res) => {
        if (!res.ok) throw new Error('Failed to fetch audit data');
        return res.json();
    });

export function useRevenueAudit(
    from: Date,
    to: Date
): UseRevenueAuditReturn {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const fromStr = from.toISOString().split('T')[0];
    const toStr = to.toISOString().split('T')[0];

    const params = new URLSearchParams({ from: fromStr, to: toStr });
    const url = `/api/v1/admin/analytics/revenue/audit?${params.toString()}`;

    const { data, error, mutate } = useSWR(
        mounted ? url : null,
        fetcher,
        {
            revalidateOnFocus: false,
            refreshInterval: 0 // Audit logs don't need aggressive polling
        }
    );

    return {
        auditData: data || null,
        isLoading: !error && !data && mounted,
        error,
        refetch: mutate
    };
}
