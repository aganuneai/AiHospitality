'use client';

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { NeoCard, NeoCardContent, NeoCardHeader, NeoCardTitle } from '@/components/neo/neo-card';

interface RoomTypeData {
    roomType: string;
    revenue: number;
    bookings: number;
}

interface RoomTypeChartProps {
    data: RoomTypeData[];
    title?: string;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export function RoomTypeChart({ data, title = 'Revenue by Room Type' }: RoomTypeChartProps) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'USD',
            notation: 'compact'
        }).format(value);
    };

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-background/95 border border-border/40 backdrop-blur-xl rounded-xl shadow-xl p-4">
                    <p className="font-bold text-foreground mb-1">{payload[0].payload.roomType}</p>
                    <div className="space-y-1">
                        <p className="text-sm font-semibold flex flex-col justify-between gap-1" style={{ color: payload[0].fill }}>
                            <span className="text-muted-foreground opacity-80 text-xs">Receita</span>
                            <span>{formatCurrency(payload[0].value)}</span>
                        </p>
                        <p className="text-sm font-semibold text-muted-foreground flex flex-col justify-between gap-1">
                            <span className="text-xs opacity-80">Reservas</span>
                            <span className="text-foreground">{payload[0].payload.bookings}</span>
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
                <NeoCardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Receita por Tipo de Quarto</NeoCardTitle>
            </NeoCardHeader>
            <NeoCardContent className="pt-6">
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                        data={data}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" horizontal={false} />
                        <XAxis
                            type="number"
                            className="text-xs font-semibold"
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            tickFormatter={formatCurrency}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            type="category"
                            dataKey="roomType"
                            className="text-xs font-semibold"
                            tick={{ fill: 'hsl(var(--foreground))' }}
                            tickLine={false}
                            axisLine={false}
                            dx={-10}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--secondary)/0.5)' }} />
                        <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={24}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </NeoCardContent>
        </NeoCard>
    );
}
