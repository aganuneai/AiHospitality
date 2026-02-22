'use client';

import { useState } from 'react';
import { subDays, format } from 'date-fns';
import { TrendingUp, Home, Calendar, AlertCircle } from 'lucide-react';
import { KpiCard } from '@/components/analytics/KpiCard';
import { OccupancyTrendChart } from '@/components/analytics/OccupancyTrendChart';
import { RoomOccupancyChart } from '@/components/analytics/RoomOccupancyChart';
import { OccupancyHeatmap } from '@/components/analytics/OccupancyHeatmap';
import { useOccupancyData } from './hooks/useOccupancyData';
import { forecastLinearRegression } from '@/lib/utils/forecast';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export default function OccupancyDashboard() {
    const [dateRange, setDateRange] = useState(30); // Last 30 days
    const [showForecast, setShowForecast] = useState(true);

    const to = new Date();
    const from = subDays(to, dateRange);

    const { occupancyData, summary, isLoading, error } = useOccupancyData(from, to);

    // Generate forecast
    const forecastData = showForecast ? forecastLinearRegression(
        occupancyData.map(d => ({
            date: new Date(d.date),
            value: d.occupancyRate
        })),
        7 // 7 days ahead
    ) : [];

    // Combine historical + forecast
    const chartData = [
        ...occupancyData.map(d => ({
            date: d.date,
            occupancyRate: d.occupancyRate
        })),
        ...forecastData.map(f => ({
            date: format(f.date, 'yyyy-MM-dd'),
            occupancyRate: undefined,
            forecastedOccupancy: f.forecastedValue
        }))
    ];

    // Mock data for room occupancy breakdown
    const roomOccupancyData = [
        { roomType: 'Deluxe', booked: 35, available: 15, total: 50, occupancyRate: 70 },
        { roomType: 'Standard', booked: 48, available: 12, total: 60, occupancyRate: 80 },
        { roomType: 'Suite', booked: 14, available: 6, total: 20, occupancyRate: 70 },
        { roomType: 'Economy', booked: 28, available: 12, total: 40, occupancyRate: 70 }
    ];

    // Calculate today's occupancy
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todayData = occupancyData.find(d => d.date === todayStr);
    const todayOccupancy = todayData?.occupancyRate || 0;

    if (error) {
        return (
            <div className="p-8">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">
                        Erro ao carregar dados de ocupação. Verifique a API e tente novamente.
                    </p>
                    <p className="text-sm text-red-600 mt-2">
                        {error.message || 'Erro desconhecido'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/40">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight font-heading text-foreground">Análise de Ocupação</h1>
                    <p className="text-muted-foreground font-medium tracking-wide">
                        Monitoramento de capacidade, tendências e projeções.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Date Range Selector */}
                    <Select
                        value={dateRange.toString()}
                        onValueChange={(value) => setDateRange(parseInt(value))}
                    >
                        <SelectTrigger className="w-[180px] h-10 bg-secondary/30 border-border/50 shadow-sm transition-all hover:bg-secondary/50 font-semibold focus:ring-1 focus:ring-primary">
                            <SelectValue placeholder="Período" />
                        </SelectTrigger>
                        <SelectContent className="bg-background/95 backdrop-blur-xl border-border/50 shadow-xl">
                            <SelectItem value="7" className="font-medium focus:bg-primary/20 focus:text-primary">Últimos 7 dias</SelectItem>
                            <SelectItem value="30" className="font-medium focus:bg-primary/20 focus:text-primary">Últimos 30 dias</SelectItem>
                            <SelectItem value="60" className="font-medium focus:bg-primary/20 focus:text-primary">Últimos 60 dias</SelectItem>
                            <SelectItem value="90" className="font-medium focus:bg-primary/20 focus:text-primary">Últimos 90 dias</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Forecast Toggle */}
                    <Select
                        value={showForecast ? 'yes' : 'no'}
                        onValueChange={(value) => setShowForecast(value === 'yes')}
                    >
                        <SelectTrigger className="w-[160px] h-10 bg-secondary/30 border-border/50 shadow-sm transition-all hover:bg-secondary/50 font-semibold focus:ring-1 focus:ring-primary">
                            <SelectValue placeholder="Projeção" />
                        </SelectTrigger>
                        <SelectContent className="bg-background/95 backdrop-blur-xl border-border/50 shadow-xl">
                            <SelectItem value="yes" className="font-medium focus:bg-primary/20 focus:text-primary">Incluir Projeções</SelectItem>
                            <SelectItem value="no" className="font-medium focus:bg-primary/20 focus:text-primary">Apenas Histórico</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-in slide-in-from-bottom-4 duration-500">
                <KpiCard
                    title="Ocupação Média"
                    value={summary.avgOccupancy}
                    icon={TrendingUp}
                    format="percentage"
                    trend={{ value: 5.2, isPositive: true }}
                />
                <KpiCard
                    title="Pico de Ocupação"
                    value={summary.peakOccupancy}
                    icon={AlertCircle}
                    format="percentage"
                />
                <KpiCard
                    title="Ocupação Hoje"
                    value={todayOccupancy}
                    icon={Home}
                    format="percentage"
                    trend={{ value: 3.1, isPositive: true }}
                />
                <KpiCard
                    title="Menor Ocupação"
                    value={summary.lowestOccupancy}
                    icon={Calendar}
                    format="percentage"
                />
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]"></div>
                </div>
            )}

            {/* Charts */}
            {!isLoading && (
                <div className="space-y-6 pt-4 border-t border-border/40">
                    {/* Occupancy Trend */}
                    <div className="animate-in slide-in-from-bottom-6 duration-700 delay-100">
                        <OccupancyTrendChart
                            data={chartData}
                            title="Tendência de Ocupação"
                            showForecast={showForecast}
                        />
                    </div>

                    {/* Room Occupancy and Heatmap */}
                    <div className="grid gap-6 md:grid-cols-2 animate-in slide-in-from-bottom-8 duration-700 delay-200">
                        <RoomOccupancyChart
                            data={roomOccupancyData}
                            title="Ocupação por Categoria"
                        />
                        <OccupancyHeatmap
                            data={occupancyData.map(d => ({
                                date: d.date,
                                occupancyRate: d.occupancyRate
                            }))}
                            month={new Date()}
                            title="Mapa de Calor (Tráfego)"
                        />
                    </div>

                    {/* Peak Info */}
                    {summary.peakDate && (
                        <div className="bg-secondary/20 border border-border/40 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between shadow-sm animate-in slide-in-from-bottom-8 duration-700 delay-300">
                            <div className="space-y-1">
                                <p className="text-sm font-bold uppercase tracking-widest text-emerald-500/80">Pico de Ocupação</p>
                                <p className="text-2xl font-black font-heading tracking-tight text-foreground">
                                    {summary.peakOccupancy.toFixed(1)}% <span className="text-muted-foreground text-sm font-medium tracking-normal ml-2">em {format(new Date(summary.peakDate), 'dd/MM/yyyy')}</span>
                                </p>
                            </div>
                            <div className="mt-4 md:mt-0 text-left md:text-right space-y-1 border-t md:border-t-0 md:border-l border-border/40 pt-4 md:pt-0 md:pl-6">
                                <p className="text-sm font-bold uppercase tracking-widest text-rose-500/80">Menor Ocupação</p>
                                <p className="text-2xl font-black font-heading tracking-tight text-foreground">
                                    {summary.lowestOccupancy.toFixed(1)}% <span className="text-muted-foreground text-sm font-medium tracking-normal ml-2">em {format(new Date(summary.lowestDate), 'dd/MM/yyyy')}</span>
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
