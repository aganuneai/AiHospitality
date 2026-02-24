'use client';

import React from 'react';
import { TrendingUp, Activity, AlertCircle } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { AvailabilityMatrixDay } from '@/lib/types/inventory';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AvailabilityGridProps {
    data: AvailabilityMatrixDay[];
    roomTypes: { id: string, code: string, name: string }[];
    viewMode?: 'count' | 'percent';
}

const getHeatmapColor = (occupancy: number, available: number) => {
    if (available <= 0) return 'bg-rose-500/20 text-rose-600 border-rose-400/30 shadow-[inset_0_0_8px_rgba(244,63,94,0.2)]';
    if (available < 0) return 'bg-rose-600 text-white border-rose-400 border-2 shadow-[0_0_15px_rgba(225,29,72,0.4)]';
    if (occupancy >= 95) return 'bg-orange-600/30 text-orange-600 border-orange-400/40';
    if (occupancy >= 90) return 'bg-orange-500/20 text-orange-600 border-orange-300/30';
    if (occupancy >= 70) return 'bg-amber-500/10 text-amber-600 border-amber-200/40';
    return 'bg-emerald-500/10 text-emerald-600 border-emerald-200/30';
};

const getOccupancyTrendColor = (occupancy: number) => {
    if (occupancy >= 90) return 'text-rose-600 font-bold';
    if (occupancy >= 70) return 'text-orange-500 font-semibold';
    return 'text-emerald-500 font-medium';
};

export function AvailabilityGrid({ data, roomTypes, viewMode = 'count' }: AvailabilityGridProps) {
    if (!data.length) return null;

    if (roomTypes.length === 0) {
        return (
            <div className="h-[400px] flex flex-col items-center justify-center bg-card/10 rounded-2xl border border-dashed border-border/50">
                <AlertCircle className="w-8 h-8 text-amber-500 opacity-50 mb-4" />
                <p className="text-sm text-muted-foreground font-medium text-center max-w-xs">
                    Nenhum tipo de quarto encontrado para este hotel. Certifique-se de que os cadastros básicos estão concluídos.
                </p>
            </div>
        );
    }

    return (
        <div className="w-full overflow-hidden rounded-2xl border border-border/50 bg-card/30 backdrop-blur-md shadow-xl">
            <TooltipProvider delayDuration={0}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr className="bg-secondary/40 border-b border-border/50">
                                <th className="sticky left-0 z-30 bg-secondary/80 backdrop-blur-md p-4 text-left font-bold text-foreground min-w-[220px] border-r border-border/50">
                                    <div className="flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-primary" />
                                        <span className="uppercase tracking-wider text-[11px]">Tipo de Quarto / Data</span>
                                    </div>
                                </th>
                                {data.map((day, i) => {
                                    const [year, month, dayNum] = day.date.split('-').map(Number);
                                    const d = new Date(year, month - 1, dayNum);
                                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                    const isToday = new Date().toLocaleDateString('en-CA') === day.date;
                                    return (
                                        <th key={i} className={cn(
                                            "p-3 text-center min-w-[70px] border-r border-border/30 transition-colors",
                                            isWeekend && "bg-secondary/20",
                                            isToday && "bg-primary/10 border-b-2 border-b-primary"
                                        )}>
                                            <div className="flex flex-col items-center">
                                                <span className="text-[10px] uppercase text-muted-foreground font-bold leading-none mb-1">
                                                    {new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(d)}
                                                </span>
                                                <span className="text-lg font-black font-heading text-foreground">
                                                    {d.getDate().toString().padStart(2, '0')}
                                                </span>
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {roomTypes.map((rt) => (
                                <tr key={rt.id} className="border-b border-border/40 group hover:bg-primary/5 transition-colors">
                                    <td className="sticky left-0 z-20 bg-background/95 backdrop-blur-md p-4 font-semibold border-r border-border/50 group-hover:bg-primary/5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-8 rounded-full bg-primary/40 shadow-[0_0_10px_rgba(var(--primary),0.2)]"></div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-foreground">{rt.code}</span>
                                                <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">{rt.name}</span>
                                            </div>
                                        </div>
                                    </td>
                                    {data.map((day, i) => {
                                        const availability = day.availability[rt.id];
                                        if (!availability) return <td key={i} className="border-r border-border/30 bg-secondary/5" />;

                                        return (
                                            <td key={i} className={cn(
                                                "p-2 border-r border-border/30 transition-all",
                                                availability.available <= 0 ? "bg-rose-500/5" : "hover:bg-secondary/40"
                                            )}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className={cn(
                                                            "w-full h-12 rounded-xl border flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95",
                                                            getHeatmapColor(availability.occupancy, availability.available)
                                                        )}>
                                                            <span className="text-lg font-black leading-none">
                                                                {viewMode === 'count' ? availability.available : `${availability.occupancy}%`}
                                                            </span>
                                                            <span className="text-[9px] font-bold opacity-70 mt-1">
                                                                {availability.price > 0 ? formatCurrency(availability.price) : 'N/A'}
                                                            </span>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="bg-popover/95 backdrop-blur-xl border-border/50 p-3 shadow-2xl">
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between gap-4">
                                                                <span className="text-xs text-muted-foreground">Ocupação:</span>
                                                                <span className="text-xs font-bold">{availability.occupancy}%</span>
                                                            </div>
                                                            <div className="flex justify-between gap-4">
                                                                <span className="text-xs text-muted-foreground">Vendidos:</span>
                                                                <span className="text-xs font-bold text-rose-500">{availability.booked}</span>
                                                            </div>
                                                            <div className="flex justify-between gap-4">
                                                                <span className="text-xs text-muted-foreground">Total:</span>
                                                                <span className="text-xs font-bold">{availability.total}</span>
                                                            </div>
                                                            {availability.available <= 0 && (
                                                                <div className="pt-1 flex items-center gap-1.5 text-[10px] text-rose-500 font-bold uppercase">
                                                                    <AlertCircle className="w-3 h-3" />
                                                                    Sold Out
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}

                            {/* Occupancy % Row */}
                            <tr className="bg-secondary/20 border-t-2 border-border/60 sticky bottom-10 z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
                                <td className="sticky left-0 z-30 bg-secondary/90 backdrop-blur-md p-4 font-black border-r border-border/50 text-foreground">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-primary" />
                                        <span className="uppercase tracking-widest text-[10px]">Ocupação %</span>
                                    </div>
                                </td>
                                {data.map((day, i) => (
                                    <td key={i} className="p-3 text-center border-r border-border/30">
                                        <span className={cn(
                                            "text-sm font-black font-mono",
                                            getOccupancyTrendColor(day.summary.avgOccupancy)
                                        )}>
                                            {day.summary.avgOccupancy}%
                                        </span>
                                    </td>
                                ))}
                            </tr>

                            {/* Total Available Row */}
                            <tr className="bg-primary/10 border-t border-border/60 sticky bottom-0 z-20 shadow-[0_-8px_20px_rgba(0,0,0,0.15)]">
                                <td className="sticky left-0 z-30 bg-primary/20 backdrop-blur-md p-4 font-black border-r border-border/50 text-primary">
                                    <span className="uppercase tracking-widest text-[10px]">Total Disponível</span>
                                </td>
                                {data.map((day, i) => (
                                    <td key={i} className="p-3 text-center border-r border-border/30">
                                        <div className="inline-flex items-center justify-center w-10 h-10 bg-primary/20 rounded-full border border-primary/30">
                                            <span className="text-sm font-black text-primary">
                                                {day.summary.totalAvailable}
                                            </span>
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </TooltipProvider>

        </div>
    );
}
