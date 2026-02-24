'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, LayoutGrid, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { AvailabilityGrid } from './AvailabilityGrid';
import { AvailabilityMatrixDay, InventoryMatrixResponse } from '@/lib/types/inventory';
import { subDays, addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function AvailabilityMatrix() {
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [data, setData] = useState<AvailabilityMatrixDay[]>([]);
    const [roomTypes, setRoomTypes] = useState<{ id: string, code: string, name: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'count' | 'percent'>('count');
    const [mounted, setMounted] = useState(false);

    const fetchData = async (date: Date) => {
        setIsLoading(true);
        setError(null);
        try {
            const dateStr = format(date, 'yyyy-MM-dd');
            const response = await fetch(`/api/v1/admin/inventory/matrix?startDate=${dateStr}`, {
                headers: {
                    'x-hotel-id': 'HOTEL_001'
                }
            });
            const result: InventoryMatrixResponse = await response.json();

            if (response.ok) {
                setData(result.days);
                setRoomTypes(result.roomTypes);
            } else {
                setError((result as any).message || 'Erro ao carregar dados do inventário.');
            }
        } catch (error: any) {
            console.error('Failed to fetch availability matrix:', error);
            setError(error.message || 'Falha na conexão com o servidor.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setMounted(true);
        setStartDate(new Date());
    }, []);

    useEffect(() => {
        if (mounted && startDate) {
            fetchData(startDate);
        }
    }, [startDate, mounted]);

    const handlePrevious = () => startDate && setStartDate(subDays(startDate, 7));
    const handleNext = () => startDate && setStartDate(addDays(startDate, 7));
    const handleToday = () => setStartDate(new Date());

    if (!mounted || !startDate) return null;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/20 p-4 rounded-2xl border border-border/50 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <div className="bg-secondary/30 p-1 rounded-xl border border-border/50 flex items-center">
                        <Button
                            variant={viewMode === 'count' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('count')}
                            className="h-8 text-[10px] font-bold uppercase rounded-lg px-4"
                        >
                            Quartos
                        </Button>
                        <Button
                            variant={viewMode === 'percent' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('percent')}
                            className="h-8 text-[10px] font-bold uppercase rounded-lg px-4"
                        >
                            Ocupação %
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-secondary/30 p-1.5 rounded-xl border border-border/50">
                    <Button variant="ghost" size="icon" onClick={handlePrevious} className="h-8 w-8 rounded-lg">
                        <ChevronLeft className="w-4 h-4" />
                    </Button>

                    <DatePicker
                        date={startDate || undefined}
                        setDate={(newDate) => newDate && setStartDate(newDate)}
                        label="Data Inicial"
                    />

                    <Button variant="ghost" size="icon" onClick={handleNext} className="h-8 w-8 rounded-lg">
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                    <div className="w-px h-4 bg-border/50 mx-1" />
                    <Button variant="ghost" size="sm" onClick={handleToday} className="h-8 text-[11px] font-bold uppercase px-3">
                        Hoje
                    </Button>
                </div>
            </div>

            {error ? (
                <div className="h-[400px] flex flex-col items-center justify-center bg-rose-500/5 rounded-2xl border border-dashed border-rose-500/20">
                    <AlertCircle className="w-8 h-8 text-rose-500 opacity-50 mb-4" />
                    <p className="text-sm text-rose-600 font-bold mb-2">Ops! Algo deu errado.</p>
                    <p className="text-xs text-muted-foreground mb-6">{error}</p>
                    <Button onClick={() => fetchData(startDate)} variant="outline" size="sm" className="gap-2">
                        <RefreshCw className="w-3.5 h-3.5" />
                        Tentar Novamente
                    </Button>
                </div>
            ) : isLoading ? (
                <div className="h-[400px] flex flex-col items-center justify-center bg-card/10 rounded-2xl border border-dashed border-border/50">
                    <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50 mb-4" />
                    <p className="text-sm text-muted-foreground font-medium animate-pulse">Sincronizando inventário com o banco de dados...</p>
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <AvailabilityGrid data={data} roomTypes={roomTypes} viewMode={viewMode} />
                </div>
            )}
        </div>
    );
}
