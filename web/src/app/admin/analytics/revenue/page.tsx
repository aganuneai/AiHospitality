'use client';

import { useState } from 'react';
import { subDays } from 'date-fns';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { DollarSign, TrendingUp, Users, Bed, Activity, BarChart3, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { KpiCard } from '@/components/analytics/KpiCard';
import { RevenueChart } from '@/components/analytics/RevenueChart';
import { RoomTypeChart } from '@/components/analytics/RoomTypeChart';
import { ChannelPieChart } from '@/components/analytics/ChannelPieChart';
import { useRevenueData } from './hooks/useRevenueData';
import { useRevenueAudit } from './hooks/useRevenueAudit';
import { RevenueAuditView } from '@/components/analytics/RevenueAuditView';
import { RatePlanPerformanceView } from '@/components/analytics/RatePlanPerformanceView';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

import { AvailabilityMatrix } from '@/components/analytics/availability-matrix/AvailabilityMatrix';

function RevenueDashboardContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const activeView = (searchParams.get('view') as 'performance' | 'audit' | 'inventory') || 'performance';

    const [dateRange, setDateRange] = useState(30);
    const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');

    const to = new Date();
    const from = subDays(to, dateRange);

    const { revenueData, summary, isLoading: isDataLoading, error } = useRevenueData(
        from,
        to,
        groupBy
    );

    const { auditData, isLoading: isAuditLoading } = useRevenueAudit(from, to);

    // Mock data for room types and channels
    const roomTypeData = [
        { roomType: 'Deluxe', revenue: 150000, bookings: 45 },
        { roomType: 'Standard', revenue: 120000, bookings: 60 },
        { roomType: 'Suite', revenue: 100000, bookings: 20 },
        { roomType: 'Economy', revenue: 50000, bookings: 35 }
    ];

    const channelData = [
        { channelCode: 'DIRECT', revenue: 180000, bookings: 75 },
        { channelCode: 'BOOKING_COM', revenue: 120000, bookings: 50 },
        { channelCode: 'EXPEDIA', revenue: 90000, bookings: 35 },
        { channelCode: 'AIRBNB', revenue: 30000, bookings: 15 }
    ];

    const setView = (view: string) => {
        const params = new URLSearchParams(searchParams);
        params.set('view', view);
        router.push(`?${params.toString()}`);
    };

    if (error) {
        return (
            <div className="p-8">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">Erro ao carregar dados de revenue.</p>
                </div>
            </div>
        );
    }

    const getHeaderInfo = () => {
        switch (activeView) {
            case 'audit': return { title: 'Auditoria de Receita', subtitle: 'Conferência detalhada de faturamento e itens de fólio.' };
            case 'inventory': return { title: 'Matriz de Inventário', subtitle: 'Controle Pro Max de disponibilidade e ocupação futura.' };
            default: return { title: 'Análise de Receita', subtitle: 'Monitoramento de performance financeira e KPIs essenciais.' };
        }
    };

    const header = getHeaderInfo();

    return (
        <div className="space-y-8 pb-20 animate-in fade-in duration-700">
            {/* Premium Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-0 border-b border-border/40">
                <div className="space-y-1 pb-4">
                    <h1 className="text-3xl font-bold tracking-tight font-heading text-foreground">
                        {header.title}
                    </h1>
                    <p className="text-muted-foreground font-medium tracking-wide">
                        {header.subtitle}
                    </p>
                </div>
                <div className="flex items-center gap-3 pb-4">
                    {activeView !== 'inventory' && (
                        <div className="bg-secondary/30 rounded-lg p-1 border border-border/50 shadow-sm flex items-center">
                            <Select value={dateRange.toString()} onValueChange={(v) => setDateRange(parseInt(v))}>
                                <SelectTrigger className="w-[160px] h-8 bg-transparent border-none shadow-none focus:ring-0 text-sm font-semibold">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="border-border/50 bg-background/95 backdrop-blur-xl">
                                    <SelectItem value="7">Últimos 7 dias</SelectItem>
                                    <SelectItem value="30">Últimos 30 dias</SelectItem>
                                    <SelectItem value="90">Últimos 90 dias</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {activeView === 'performance' && (
                        <div className="bg-secondary/30 rounded-lg p-1 border border-border/50 shadow-sm flex items-center">
                            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as any)}>
                                <SelectTrigger className="w-[140px] h-8 bg-transparent border-none shadow-none focus:ring-0 text-sm font-semibold">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="border-border/50 bg-background/95 backdrop-blur-xl">
                                    <SelectItem value="day">Por Dia</SelectItem>
                                    <SelectItem value="week">Por Semana</SelectItem>
                                    <SelectItem value="month">Por Mês</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Tabs Navigation */}
            <div className="flex gap-8 border-b border-border/40 -mt-8 bg-card/10 px-4">
                {[
                    { id: 'performance', label: 'Monitor de Performance', icon: BarChart3 },
                    { id: 'audit', label: 'Auditoria Comercial', icon: History }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setView(tab.id)}
                        className={cn(
                            "pb-4 pt-4 px-1 flex items-center gap-2.5 text-sm font-bold transition-all relative group",
                            activeView === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <tab.icon className={cn("w-4 h-4 transition-colors", activeView === tab.id ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                        {tab.label}
                        {activeView === tab.id && (
                            <motion.div
                                layoutId="revenueTabUnderline"
                                className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                                initial={false}
                            />
                        )}
                    </button>
                ))}
            </div>

            {/* KPI Cards (Hidden for inventory view to focus on the grid) */}
            {activeView !== 'inventory' && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-in slide-in-from-bottom-4 duration-500">
                    <KpiCard title="Receita Total" value={summary.totalRevenue} icon={DollarSign} format="currency" trend={{ value: 12.5, isPositive: true }} />
                    <KpiCard title="Total de Reservas" value={summary.totalBookings} icon={Users} format="number" trend={{ value: 8.3, isPositive: true }} />
                    <KpiCard title="Diária Média" value={summary.avgAdr} icon={TrendingUp} format="currency" trend={{ value: 3.7, isPositive: true }} />
                    <KpiCard title="RevPAR" value={summary.avgRevpar} icon={Bed} format="currency" trend={{ value: -2.1, isPositive: false }} />
                </div>
            )}

            {(isDataLoading && activeView !== 'inventory') && (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            )}

            {!(isDataLoading && activeView !== 'inventory') && (
                <AnimatePresence mode="wait">
                    {activeView === 'performance' ? (
                        <motion.div
                            key="performance"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="space-y-6"
                        >
                            <RevenueChart data={revenueData} title="Receita ao Longo do Tempo" />
                            <div className="grid gap-6 md:grid-cols-2">
                                <RoomTypeChart data={roomTypeData} />
                                <ChannelPieChart data={channelData} />
                            </div>
                            <div className="pt-8 border-t border-border/40 mt-8">
                                <div className="mb-6 flex items-center gap-3">
                                    <div className="p-2.5 bg-indigo-600/10 rounded-xl"><TrendingUp className="w-5 h-5 text-indigo-600" /></div>
                                    <div>
                                        <h2 className="text-2xl font-bold font-heading text-foreground">Performance por Plano Tarifário</h2>
                                        <p className="text-muted-foreground font-medium text-sm">Análise de share de receita e eficiência de ADR por segmento.</p>
                                    </div>
                                </div>
                                <RatePlanPerformanceView from={from} to={to} />
                            </div>
                        </motion.div>
                    ) : activeView === 'inventory' ? (
                        <motion.div
                            key="inventory"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <AvailabilityMatrix />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="audit"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="pt-4"
                        >
                            <div className="mb-6 flex items-center gap-3">
                                <div className="p-2.5 bg-primary/10 rounded-xl"><Activity className="w-5 h-5 text-primary" /></div>
                                <div>
                                    <h2 className="text-2xl font-bold font-heading text-foreground">Inteligência Comercial</h2>
                                    <p className="text-muted-foreground font-medium text-sm">Auditoria detalhada de fólio e itens transacionados.</p>
                                </div>
                            </div>
                            {auditData ? (
                                <RevenueAuditView data={auditData} isLoading={isAuditLoading} />
                            ) : (
                                <div className="flex items-center justify-center py-12">
                                    <Activity className="w-8 h-8 animate-pulse text-primary opacity-50" />
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            )}
        </div>
    );
}

export default function RevenueDashboard() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>}>
            <RevenueDashboardContent />
        </Suspense>
    );
}
