'use client';

import { useState } from 'react';
import { subDays } from 'date-fns';
import { DollarSign, TrendingUp, Users, Bed, Activity } from 'lucide-react';
import { KpiCard } from '@/components/analytics/KpiCard';
import { RevenueChart } from '@/components/analytics/RevenueChart';
import { RoomTypeChart } from '@/components/analytics/RoomTypeChart';
import { ChannelPieChart } from '@/components/analytics/ChannelPieChart';
import { useRevenueData } from './hooks/useRevenueData';
import { useRevenueAudit } from './hooks/useRevenueAudit';
import { RevenueAuditView } from '@/components/analytics/RevenueAuditView';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export default function RevenueDashboard() {
    const [dateRange, setDateRange] = useState(30); // Last 30 days
    const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');

    const to = new Date();
    const from = subDays(to, dateRange);

    const { revenueData, summary, isLoading: isDataLoading, error } = useRevenueData(
        from,
        to,
        groupBy
    );

    const { auditData, isLoading: isAuditLoading } = useRevenueAudit(from, to);

    // Mock data for room types and channels (will be replaced with real API)
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

    if (error) {
        return (
            <div className="p-8">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">
                        Erro ao carregar dados de revenue. Verifique a API e tente novamente.
                    </p>
                    <p className="text-sm text-red-600 mt-2">
                        {error.message || 'Erro desconhecido'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20 animate-in fade-in duration-700">
            {/* Premium Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/40">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight font-heading text-foreground">
                        Análise de Receita
                    </h1>
                    <p className="text-muted-foreground font-medium tracking-wide">
                        Monitoramento de performance financeira e KPIs essenciais.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Date Range Selector */}
                    <div className="bg-secondary/30 rounded-lg p-1 border border-border/50 shadow-sm flex items-center">
                        <Select
                            value={dateRange.toString()}
                            onValueChange={(value) => setDateRange(parseInt(value))}
                        >
                            <SelectTrigger className="w-[160px] h-8 bg-transparent border-none shadow-none focus:ring-0 text-sm font-semibold">
                                <SelectValue placeholder="Período" />
                            </SelectTrigger>
                            <SelectContent className="border-border/50 bg-background/95 backdrop-blur-xl">
                                <SelectItem value="7">Últimos 7 dias</SelectItem>
                                <SelectItem value="30">Últimos 30 dias</SelectItem>
                                <SelectItem value="60">Últimos 60 dias</SelectItem>
                                <SelectItem value="90">Últimos 90 dias</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Group By Selector */}
                    <div className="bg-secondary/30 rounded-lg p-1 border border-border/50 shadow-sm flex items-center">
                        <Select
                            value={groupBy}
                            onValueChange={(value) => setGroupBy(value as 'day' | 'week' | 'month')}
                        >
                            <SelectTrigger className="w-[140px] h-8 bg-transparent border-none shadow-none focus:ring-0 text-sm font-semibold">
                                <SelectValue placeholder="Agrupar por" />
                            </SelectTrigger>
                            <SelectContent className="border-border/50 bg-background/95 backdrop-blur-xl">
                                <SelectItem value="day">Por Dia</SelectItem>
                                <SelectItem value="week">Por Semana</SelectItem>
                                <SelectItem value="month">Por Mês</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-in slide-in-from-bottom-4 duration-500">
                <KpiCard
                    title="Receita Total"
                    value={summary.totalRevenue}
                    icon={DollarSign}
                    format="currency"
                    trend={{ value: 12.5, isPositive: true }}
                />
                <KpiCard
                    title="Total de Reservas"
                    value={summary.totalBookings}
                    icon={Users}
                    format="number"
                    trend={{ value: 8.3, isPositive: true }}
                />
                <KpiCard
                    title="Diária Média (ADR)"
                    value={summary.avgAdr}
                    icon={TrendingUp}
                    format="currency"
                    trend={{ value: 3.7, isPositive: true }}
                />
                <KpiCard
                    title="RevPAR"
                    value={summary.avgRevpar}
                    icon={Bed}
                    format="currency"
                    trend={{ value: -2.1, isPositive: false }}
                />
            </div>

            {/* Loading State */}
            {isDataLoading && (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            )}

            {/* Charts & Audit */}
            {!isDataLoading && (
                <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-700">
                    {/* Revenue Over Time */}
                    <RevenueChart data={revenueData} title="Receita ao Longo do Tempo" />

                    {/* Room Type and Channel Charts */}
                    <div className="grid gap-6 md:grid-cols-2">
                        <RoomTypeChart data={roomTypeData} />
                        <ChannelPieChart data={channelData} />
                    </div>

                    {/* Revenue Audit View (Commercial Intelligence) */}
                    <div className="pt-8 border-t border-border/40 mt-8">
                        <div className="mb-6 flex items-center gap-3">
                            <div className="p-2.5 bg-primary/10 rounded-xl">
                                <Activity className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold font-heading text-foreground">Inteligência Comercial</h2>
                                <p className="text-muted-foreground font-medium text-sm">Auditoria detalhada de fólio e itens transacionados.</p>
                            </div>
                        </div>
                        {auditData && (
                            <RevenueAuditView
                                data={auditData}
                                isLoading={isAuditLoading}
                            />
                        )}
                        {!auditData && isAuditLoading && (
                            <div className="flex items-center justify-center py-12">
                                <Activity className="w-8 h-8 animate-pulse text-primary opacity-50" />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
