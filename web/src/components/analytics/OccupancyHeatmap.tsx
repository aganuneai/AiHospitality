'use client';

import { NeoCard, NeoCardContent, NeoCardHeader, NeoCardTitle } from '@/components/neo/neo-card';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OccupancyHeatmapProps {
    data: { date: string; occupancyRate: number }[];
    title?: string;
    month?: Date;
}

export function OccupancyHeatmap({
    data,
    title = 'Occupancy Heatmap',
    month = new Date()
}: OccupancyHeatmapProps) {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Create a map for quick lookup
    const occupancyMap = new Map(
        data.map(item => [item.date, item.occupancyRate])
    );

    // Get color based on occupancy rate
    const getColor = (rate: number | undefined): string => {
        if (rate === undefined) return 'bg-secondary/20 border-border/20';
        if (rate >= 90) return 'bg-rose-500/90 text-white border-rose-600/50 shadow-[0_0_10px_rgba(244,63,94,0.4)]';
        if (rate >= 80) return 'bg-amber-500/90 text-white border-amber-600/50 shadow-[0_0_10px_rgba(245,158,11,0.4)]';
        if (rate >= 70) return 'bg-emerald-500/90 text-white border-emerald-600/50 shadow-[0_0_10px_rgba(16,185,129,0.4)]';
        if (rate >= 50) return 'bg-emerald-500/60 text-white border-emerald-500/30';
        if (rate >= 30) return 'bg-emerald-500/40 text-emerald-950 dark:text-emerald-50 border-emerald-500/20';
        return 'bg-emerald-500/20 text-emerald-900 dark:text-emerald-100 border-emerald-500/10';
    };

    // Group days by weeks
    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];

    // Add empty days at the start of the first week
    const firstDayOfWeek = getDay(days[0]);
    for (let i = 0; i < firstDayOfWeek; i++) {
        currentWeek.push(new Date(0)); // Use epoch as placeholder
    }

    days.forEach((day, index) => {
        currentWeek.push(day);
        if (getDay(day) === 6 || index === days.length - 1) {
            weeks.push([...currentWeek]);
            currentWeek = [];
        }
    });

    return (
        <NeoCard className="shadow-sm border border-border/50 bg-background/50 backdrop-blur-xl">
            <NeoCardHeader className="border-b border-border/40 bg-secondary/10 pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <NeoCardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{title}</NeoCardTitle>
                        <p className="text-lg font-bold font-heading mt-1 text-foreground capitalize">
                            {format(monthStart, 'MMMM yyyy', { locale: ptBR })}
                        </p>
                    </div>
                </div>
            </NeoCardHeader>
            <NeoCardContent className="pt-6">
                {/* Legend */}
                <div className="flex items-center justify-end gap-3 mb-6 text-xs font-semibold">
                    <span className="text-muted-foreground tracking-wide uppercase text-[10px]">Baixa</span>
                    <div className="flex gap-1.5">
                        <div className="w-5 h-5 rounded-md bg-emerald-500/20 border border-emerald-500/10"></div>
                        <div className="w-5 h-5 rounded-md bg-emerald-500/40 border border-emerald-500/20"></div>
                        <div className="w-5 h-5 rounded-md bg-emerald-500/60 border border-emerald-500/30"></div>
                        <div className="w-5 h-5 rounded-md bg-emerald-500/90 border border-emerald-600/50"></div>
                        <div className="w-5 h-5 rounded-md bg-amber-500/90 border border-amber-600/50"></div>
                        <div className="w-5 h-5 rounded-md bg-rose-500/90 border border-rose-600/50"></div>
                    </div>
                    <span className="text-muted-foreground tracking-wide uppercase text-[10px]">Alta</span>
                </div>

                {/* Calendar Grid */}
                <div className="space-y-2">
                    {/* Week days header */}
                    <div className="grid grid-cols-7 gap-2 mb-3">
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                            <div key={day} className="text-center text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar days */}
                    {weeks.map((week, weekIndex) => (
                        <div key={weekIndex} className="grid grid-cols-7 gap-2">
                            {week.map((day, dayIndex) => {
                                const isPlaceholder = day.getTime() === 0;
                                if (isPlaceholder) {
                                    return <div key={dayIndex} className="aspect-square rounded-xl bg-transparent" />;
                                }

                                const dateStr = format(day, 'yyyy-MM-dd');
                                const occupancy = occupancyMap.get(dateStr);
                                const styleClass = getColor(occupancy);

                                return (
                                    <div
                                        key={dayIndex}
                                        className={`aspect-square rounded-xl flex flex-col items-center justify-center border transition-all hover:scale-105 hover:z-10 cursor-pointer ${styleClass}`}
                                        title={`${format(day, 'dd/MM/yyyy', { locale: ptBR })}: ${occupancy?.toFixed(1) || 'N/A'}%`}
                                    >
                                        <div className="text-sm font-bold tracking-tighter">{format(day, 'd')}</div>
                                        {occupancy !== undefined && (
                                            <div className="text-[10px] font-semibold opacity-90 mt-0.5">{occupancy.toFixed(0)}%</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </NeoCardContent>
        </NeoCard>
    );
}
