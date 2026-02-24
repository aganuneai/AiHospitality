'use client';

import { useState, useEffect } from 'react';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import { NeoCard, NeoCardContent, NeoCardHeader, NeoCardTitle } from '@/components/neo/neo-card';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RatePlanData {
    code: string;
    name: string;
    revenue: number;
    bookings: number;
    roomNights: number;
    adr: number;
    share: number;
}

interface RatePlanPerformanceViewProps {
    from: Date;
    to: Date;
}

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

export function RatePlanPerformanceView({ from, to }: RatePlanPerformanceViewProps) {
    const [data, setData] = useState<RatePlanData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchPerformance() {
            try {
                setLoading(true);
                const query = new URLSearchParams({
                    from: from.toISOString(),
                    to: to.toISOString()
                });

                const res = await fetch(`/api/v1/admin/analytics/rate-plans?${query}`, {
                    headers: { 'x-hotel-id': 'HOTEL_001' }
                });

                if (res.ok) {
                    const result = await res.json();
                    setData(result);
                }
            } catch (error) {
                console.error("Error fetching rate plan performance:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchPerformance();
    }, [from, to]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            notation: 'compact'
        }).format(value);
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
                <div className="h-[400px] bg-secondary/20 rounded-2xl" />
                <div className="h-[400px] bg-secondary/20 rounded-2xl" />
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <NeoCard glass className="p-12 text-center">
                <p className="text-muted-foreground font-bold italic">Sem dados de performance para o período selecionado.</p>
            </NeoCard>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Chart Column */}
            <div className="lg:col-span-5">
                <NeoCard className="h-full bg-background/50 backdrop-blur-xl border-border/40 shadow-xl overflow-hidden" glass>
                    <NeoCardHeader className="bg-secondary/5 border-b border-border/40">
                        <NeoCardTitle className="text-sm font-black italic tracking-tighter uppercase text-muted-foreground flex justify-between items-center">
                            <span>Distribuição de Receita</span>
                            <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full not-italic">Rate Plan Share</span>
                        </NeoCardTitle>
                    </NeoCardHeader>
                    <NeoCardContent className="p-6">
                        <div className="h-[320px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={100}
                                        paddingAngle={4}
                                        dataKey="revenue"
                                        stroke="none"
                                    >
                                        {data.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        content={({ active, payload }: any) => {
                                            if (active && payload && payload.length) {
                                                const d = payload[0].payload;
                                                return (
                                                    <div className="bg-background/95 border border-border/40 backdrop-blur-xl rounded-xl shadow-2xl p-4">
                                                        <p className="font-black text-foreground text-sm uppercase italic mb-2">{d.name}</p>
                                                        <div className="space-y-1.5">
                                                            <div className="flex justify-between gap-8 text-xs font-bold">
                                                                <span className="text-muted-foreground">Receita:</span>
                                                                <span style={{ color: payload[0].fill }}>{formatCurrency(d.revenue)}</span>
                                                            </div>
                                                            <div className="flex justify-between gap-8 text-xs font-bold">
                                                                <span className="text-muted-foreground">Participação:</span>
                                                                <span>{d.share.toFixed(1)}%</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Legend
                                        verticalAlign="bottom"
                                        align="center"
                                        layout="horizontal"
                                        formatter={(value, entry: any) => (
                                            <span className="text-[10px] font-black uppercase text-muted-foreground ml-1">
                                                {entry.payload.code}
                                            </span>
                                        )}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </NeoCardContent>
                </NeoCard>
            </div>

            {/* Table Column */}
            <div className="lg:col-span-7">
                <NeoCard className="h-full bg-background/50 backdrop-blur-xl border-border/40 shadow-xl" glass>
                    <NeoCardHeader className="bg-secondary/5 border-b border-border/40">
                        <NeoCardTitle className="text-sm font-black italic tracking-tighter uppercase text-muted-foreground">
                            Ranking de Performance por Plano
                        </NeoCardTitle>
                    </NeoCardHeader>
                    <NeoCardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-secondary/10 border-b border-border/40">
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Plano Tarifário</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Reservas</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Noites</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">ADR</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Receita Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((plan, index) => (
                                        <tr key={plan.code} className="border-b border-border/20 hover:bg-primary/5 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black italic uppercase tracking-tighter text-foreground">{plan.name}</span>
                                                        <span className="text-[10px] font-bold text-muted-foreground font-mono">{plan.code}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-sm">{plan.bookings}</td>
                                            <td className="px-6 py-4 text-right font-black text-sm">{plan.roomNights}</td>
                                            <td className="px-6 py-4 text-right font-black text-sm font-mono text-emerald-500">
                                                {formatCurrency(plan.adr)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-sm font-black font-mono text-indigo-600">{formatCurrency(plan.revenue)}</span>
                                                    <div className="w-16 h-1.5 bg-secondary/30 rounded-full mt-1 overflow-hidden">
                                                        <div
                                                            className="h-full bg-indigo-600"
                                                            style={{ width: `${plan.share}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </NeoCardContent>
                </NeoCard>
            </div>
        </div>
    );
}
