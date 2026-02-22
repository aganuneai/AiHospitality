'use client';

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import { NeoCard, NeoCardContent, NeoCardHeader, NeoCardTitle } from '@/components/neo/neo-card';

interface RevenueDataPoint {
    period: string;
    revenue: number;
    bookings: number;
}

interface RevenueChartProps {
    data: RevenueDataPoint[];
    title?: string;
}

export function RevenueChart({ data, title = 'Revenue Over Time' }: RevenueChartProps) {
    // Format currency for tooltip
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'USD'
        }).format(value);
    };

    // Custom tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-background/95 border border-border/40 backdrop-blur-xl rounded-xl shadow-xl p-4">
                    <p className="font-bold text-foreground mb-1">{payload[0].payload.period}</p>
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-primary flex items-center justify-between gap-4">
                            <span>Receita:</span>
                            <span>{formatCurrency(payload[0].value)}</span>
                        </p>
                        <p className="text-sm font-semibold text-emerald-500 flex items-center justify-between gap-4">
                            <span>Reservas:</span>
                            <span>{payload[1]?.value || 0}</span>
                        </p>
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
                    <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                        <XAxis
                            dataKey="period"
                            className="text-xs font-semibold"
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                        />
                        <YAxis
                            yAxisId="left"
                            className="text-xs font-semibold"
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                            tickLine={false}
                            axisLine={false}
                            dx={-10}
                        />
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            className="text-xs font-semibold"
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            tickLine={false}
                            axisLine={false}
                            dx={10}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '4 4' }} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                        <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="revenue"
                            stroke="hsl(var(--primary))"
                            strokeWidth={3}
                            dot={{ fill: 'hsl(var(--background))', stroke: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                            name="Receita"
                        />
                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="bookings"
                            stroke="#10B981"
                            strokeWidth={3}
                            dot={{ fill: 'hsl(var(--background))', stroke: '#10B981', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, fill: '#10B981', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                            name="Reservas"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </NeoCardContent>
        </NeoCard>
    );
}
