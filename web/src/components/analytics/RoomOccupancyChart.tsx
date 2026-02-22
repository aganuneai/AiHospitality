'use client';

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import { NeoCard, NeoCardContent, NeoCardHeader, NeoCardTitle } from '@/components/neo/neo-card';

interface RoomOccupancyData {
    roomType: string;
    booked: number;
    available: number;
    total: number;
    occupancyRate: number;
}

interface RoomOccupancyChartProps {
    data: RoomOccupancyData[];
    title?: string;
}

export function RoomOccupancyChart({ data, title = 'Occupancy by Room Type' }: RoomOccupancyChartProps) {
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const item = payload[0].payload;
            return (
                <div className="bg-background/95 border border-border/40 backdrop-blur-xl rounded-xl shadow-xl p-4">
                    <p className="font-bold text-foreground mb-1">{item.roomType}</p>
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-primary flex items-center justify-between gap-4">
                            <span>Ocupados:</span>
                            <span>{item.booked}</span>
                        </p>
                        <p className="text-sm font-semibold text-muted-foreground flex items-center justify-between gap-4">
                            <span>Disponíveis:</span>
                            <span>{item.available}</span>
                        </p>
                        <p className="text-sm font-semibold text-emerald-500/80 flex items-center justify-between gap-4">
                            <span>Ocupação (%):</span>
                            <span>{item.occupancyRate.toFixed(1)}%</span>
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
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                        <XAxis
                            dataKey="roomType"
                            className="text-xs font-semibold"
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                        />
                        <YAxis
                            className="text-xs font-semibold"
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            tickLine={false}
                            axisLine={false}
                            dx={-10}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--secondary)/0.5)' }} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                        <Bar
                            dataKey="booked"
                            stackId="a"
                            fill="hsl(var(--primary))"
                            radius={[0, 0, 4, 4]}
                            name="Ocupados"
                            barSize={32}
                        />
                        <Bar
                            dataKey="available"
                            stackId="a"
                            fill="hsl(var(--border))"
                            radius={[4, 4, 0, 0]}
                            name="Disponíveis"
                            barSize={32}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </NeoCardContent>
        </NeoCard>
    );
}
