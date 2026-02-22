'use client';

import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import { NeoCard, NeoCardContent, NeoCardHeader, NeoCardTitle } from '@/components/neo/neo-card';

interface ChannelData {
    channelCode: string;
    revenue: number;
    bookings: number;
}

interface ChannelPieChartProps {
    data: ChannelData[];
    title?: string;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export function ChannelPieChart({ data, title = 'Revenue by Channel' }: ChannelPieChartProps) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'USD',
            notation: 'compact'
        }).format(value);
    };

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const percentage = ((data.revenue / data.totalRevenue) * 100).toFixed(1);

            return (
                <div className="bg-background/95 border border-border/40 backdrop-blur-xl rounded-xl shadow-xl p-4">
                    <p className="font-bold text-foreground mb-1">{data.channelCode}</p>
                    <div className="space-y-1">
                        <p className="text-sm font-semibold flex items-center justify-between gap-4" style={{ color: payload[0].fill }}>
                            <span>Receita:</span>
                            <span>{formatCurrency(data.revenue)}</span>
                        </p>
                        <p className="text-sm font-semibold text-muted-foreground flex items-center justify-between gap-4">
                            <span>Participação:</span>
                            <span>{percentage}%</span>
                        </p>
                        <p className="text-sm font-semibold text-muted-foreground flex items-center justify-between gap-4">
                            <span>Reservas:</span>
                            <span>{data.bookings}</span>
                        </p>
                    </div>
                </div>
            );
        }
        return null;
    };

    // Add total revenue to each item for percentage calculation
    const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
    const chartData = data.map(item => ({
        ...item,
        totalRevenue
    }));

    // Custom label
    const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        if (percent < 0.05) return null; // Don't show label for very small slices

        return (
            <text
                x={x}
                y={y}
                fill="white"
                textAnchor="middle"
                dominantBaseline="central"
                className="text-xs font-bold drop-shadow-md"
            >
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <NeoCard className="shadow-sm border border-border/50 bg-background/50 backdrop-blur-xl">
            <NeoCardHeader className="border-b border-border/40 bg-secondary/10">
                <NeoCardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Receita por Canal</NeoCardTitle>
            </NeoCardHeader>
            <NeoCardContent className="pt-6">
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={renderCustomLabel}
                            outerRadius={110}
                            innerRadius={60}
                            paddingAngle={2}
                            dataKey="revenue"
                            stroke="none"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            formatter={(value, entry: any) => <span className="text-xs font-semibold text-foreground ml-1">{entry.payload.channelCode}</span>}
                            iconType="circle"
                            wrapperStyle={{ paddingTop: '20px' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </NeoCardContent>
        </NeoCard>
    );
}
