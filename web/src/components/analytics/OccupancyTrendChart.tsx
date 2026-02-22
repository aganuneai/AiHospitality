'use client';

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import { NeoCard, NeoCardContent, NeoCardHeader, NeoCardTitle } from '@/components/neo/neo-card';

interface OccupancyDataPoint {
    date: string;
    occupancyRate?: number;
    forecastedOccupancy?: number;
}

interface OccupancyTrendChartProps {
    data: OccupancyDataPoint[];
    title?: string;
    showForecast?: boolean;
}

export function OccupancyTrendChart({
    data,
    title = 'Occupancy Trend',
    showForecast = false
}: OccupancyTrendChartProps) {
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-background/95 border border-border/40 backdrop-blur-xl rounded-xl shadow-xl p-4">
                    <p className="font-bold text-foreground mb-1">{payload[0].payload.date}</p>
                    <div className="space-y-1">
                        {payload[0]?.value !== undefined && (
                            <p className="text-sm font-semibold flex items-center justify-between gap-4" style={{ color: "hsl(var(--primary))" }}>
                                <span>Ocupação:</span>
                                <span>{Number(payload[0].value).toFixed(1)}%</span>
                            </p>
                        )}
                        {showForecast && payload[1]?.value !== undefined && (
                            <p className="text-sm font-semibold text-emerald-500 flex items-center justify-between gap-4">
                                <span>Projeção (Forecast):</span>
                                <span>{Number(payload[1].value).toFixed(1)}%</span>
                            </p>
                        )}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <NeoCard className="shadow-sm border border-border/50 bg-background/50 backdrop-blur-xl">
            <NeoCardHeader className="border-b border-border/40 bg-secondary/10">
                <NeoCardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{title}</NeoCardTitle>
            </NeoCardHeader>
            <NeoCardContent className="pt-6">
                <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <defs>
                            <linearGradient id="colorOccupancy" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                        <XAxis
                            dataKey="date"
                            className="text-xs font-semibold"
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                        />
                        <YAxis
                            className="text-xs font-semibold"
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            domain={[0, 100]}
                            tickFormatter={(value) => `${value}%`}
                            tickLine={false}
                            axisLine={false}
                            dx={-10}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '4 4' }} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                        <Area
                            type="monotone"
                            dataKey="occupancyRate"
                            stroke="hsl(var(--primary))"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorOccupancy)"
                            name="Ocupação (Histórico)"
                        />
                        {showForecast && (
                            <Area
                                type="monotone"
                                dataKey="forecastedOccupancy"
                                stroke="#10B981"
                                strokeWidth={3}
                                strokeDasharray="6 6"
                                fillOpacity={1}
                                fill="url(#colorForecast)"
                                name="Projeção (Forecast)"
                            />
                        )}
                    </AreaChart>
                </ResponsiveContainer>
            </NeoCardContent>
        </NeoCard>
    );
}
