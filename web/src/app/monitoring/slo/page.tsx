/**
 * SLO Dashboards
 * 
 * Service Level Objective monitoring for partner-facing APIs:
 * - Availability tracking (uptime)
 * - Latency percentiles (P50, P95, P99)
 * - Error rate monitoring
 * - Request rate tracking
 */

'use client';

import { useState, useEffect } from 'react';

/**
 * SLO metric
 */
interface SLOMetric {
    name: string;
    current: number;
    target: number;
    status: 'healthy' | 'at-risk' | 'violated';
    unit: string;
}

/**
 * Time series data point
 */
interface DataPoint {
    timestamp: Date;
    value: number;
}

/**
 * SLO Dashboard Component
 */
export default function SLODashboard() {
    const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
    const [metrics, setMetrics] = useState<SLOMetric[]>([]);
    const [latencyData, setLatencyData] = useState<DataPoint[]>([]);

    /**
     * Load SLO metrics
     */
    useEffect(() => {
        loadMetrics();
        const interval = setInterval(loadMetrics, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, [timeRange]);

    /**
     * Load metrics from API
     */
    const loadMetrics = async () => {
        // In production, fetch from monitoring API (Prometheus, Datadog, etc.)
        const mockMetrics: SLOMetric[] = [
            {
                name: 'API Availability',
                current: 99.97,
                target: 99.9,
                status: 'healthy',
                unit: '%'
            },
            {
                name: 'P95 Latency',
                current: 142,
                target: 200,
                status: 'healthy',
                unit: 'ms'
            },
            {
                name: 'P99 Latency',
                current: 287,
                target: 500,
                status: 'healthy',
                unit: 'ms'
            },
            {
                name: 'Error Rate',
                current: 0.12,
                target: 1.0,
                status: 'healthy',
                unit: '%'
            },
            {
                name: 'Request Rate',
                current: 1247,
                target: 10000,
                status: 'healthy',
                unit: 'req/min'
            }
        ];

        setMetrics(mockMetrics);

        // Mock time series data
        const now = Date.now();
        const points: DataPoint[] = [];
        for (let i = 24; i >= 0; i--) {
            points.push({
                timestamp: new Date(now - i * 60 * 60 * 1000),
                value: 120 + Math.random() * 40
            });
        }
        setLatencyData(points);
    };

    /**
     * Get status color
     */
    const getStatusColor = (status: SLOMetric['status']) => {
        switch (status) {
            case 'healthy': return 'text-green-500';
            case 'at-risk': return 'text-yellow-500';
            case 'violated': return 'text-red-500';
        }
    };

    /**
     * Get status badge
     */
    const getStatusBadge = (status: SLOMetric['status']) => {
        switch (status) {
            case 'healthy':
                return <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs font-semibold">✓ HEALTHY</span>;
            case 'at-risk':
                return <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded text-xs font-semibold">⚠ AT RISK</span>;
            case 'violated':
                return <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded text-xs font-semibold">✗ VIOLATED</span>;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                            SLO Monitoring
                        </h1>
                        <p className="text-slate-600 dark:text-slate-300 mt-2">
                            Real-time Service Level Objectives tracking
                        </p>
                    </div>

                    {/* Time Range Selector */}
                    <div className="flex gap-2">
                        {(['1h', '24h', '7d', '30d'] as const).map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${timeRange === range
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                    }`}
                            >
                                {range}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Overall Status */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                        Overall Health
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                            <span className="text-2xl text-white">✓</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-green-500">All Systems Operational</p>
                            <p className="text-slate-600 dark:text-slate-300">
                                All SLOs are within target thresholds
                            </p>
                        </div>
                    </div>
                </div>

                {/* SLO Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {metrics.map((metric) => (
                        <div
                            key={metric.name}
                            className="bg-white dark:bg-slate-800 rounded-lg shadow p-6"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                    {metric.name}
                                </h3>
                                {getStatusBadge(metric.status)}
                            </div>

                            <div className="mb-4">
                                <div className="flex items-baseline gap-2">
                                    <span className={`text-4xl font-bold ${getStatusColor(metric.status)}`}>
                                        {metric.current}
                                    </span>
                                    <span className="text-slate-600 dark:text-slate-400">
                                        {metric.unit}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                    Target: {metric.target}{metric.unit}
                                </p>
                            </div>

                            {/* Progress Bar */}
                            <div className="relative w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className={`absolute left-0 top-0 h-full transition-all ${metric.status === 'healthy'
                                            ? 'bg-green-500'
                                            : metric.status === 'at-risk'
                                                ? 'bg-yellow-500'
                                                : 'bg-red-500'
                                        }`}
                                    style={{
                                        width: `${Math.min((metric.current / metric.target) * 100, 100)}%`
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Latency Chart */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                        P95 Latency Trend
                    </h2>

                    <div className="relative h-64">
                        <svg className="w-full h-full">
                            {/* Grid lines */}
                            {[0, 50, 100, 150, 200].map((y) => (
                                <g key={y}>
                                    <line
                                        x1="0"
                                        y1={256 - (y / 200) * 256}
                                        x2="100%"
                                        y2={256 - (y / 200) * 256}
                                        stroke="currentColor"
                                        strokeWidth="1"
                                        className="text-slate-200 dark:text-slate-700"
                                    />
                                    <text
                                        x="10"
                                        y={256 - (y / 200) * 256 - 5}
                                        className="text-xs fill-slate-600 dark:fill-slate-400"
                                    >
                                        {y}ms
                                    </text>
                                </g>
                            ))}

                            {/* Line chart */}
                            {latencyData.length > 1 && (
                                <polyline
                                    points={latencyData
                                        .map((point, idx) => {
                                            const x = (idx / (latencyData.length - 1)) * 100;
                                            const y = 256 - (point.value / 200) * 256;
                                            return `${x}%,${y}`;
                                        })
                                        .join(' ')}
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="text-blue-500"
                                />
                            )}
                        </svg>
                    </div>
                </div>

                {/* SLO Compliance Table */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
                    <div className="p-6">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                            SLO Compliance History
                        </h2>
                    </div>

                    <table className="w-full">
                        <thead className="bg-slate-100 dark:bg-slate-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase">
                                    Period
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase">
                                    Availability
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase">
                                    P95 Latency
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase">
                                    Error Rate
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase">
                                    Status
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {[
                                { period: 'Last Hour', availability: 100.0, latency: 135, errorRate: 0.08 },
                                { period: 'Last 24 Hours', availability: 99.97, latency: 142, errorRate: 0.12 },
                                { period: 'Last 7 Days', availability: 99.95, latency: 156, errorRate: 0.15 },
                                { period: 'Last 30 Days', availability: 99.92, latency: 168, errorRate: 0.18 }
                            ].map((row) => (
                                <tr key={row.period} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                                        {row.period}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                        {row.availability}%
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                        {row.latency}ms
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                        {row.errorRate}%
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs font-semibold">
                                            ✓ Met
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* SLO Definitions */}
                <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-4">
                        📋 SLO Definitions
                    </h3>
                    <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
                        <li><strong>Availability:</strong> Percentage of successful requests (non-5xx responses) ≥ 99.9%</li>
                        <li><strong>P95 Latency:</strong> 95th percentile response time ≤ 200ms</li>
                        <li><strong>P99 Latency:</strong> 99th percentile response time ≤ 500ms</li>
                        <li><strong>Error Rate:</strong> Percentage of 4xx/5xx responses ≤ 1.0%</li>
                        <li><strong>Request Rate:</strong> Maximum sustained throughput ≥ 10,000 req/min</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
