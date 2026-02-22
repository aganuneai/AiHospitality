"use client"

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Users, Baby, Info, Loader2, Sparkles, BadgeDollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OccupancyBreakdownModalProps {
    isOpen: boolean;
    onClose: () => void;
    baseRate: number;
    ratePlanId: string;
    ratePlanCode: string;
    date: string;
}

interface OccupancyData {
    adults: Record<string, number>;
    children: Array<{ label: string, price: number, tier: number }>;
    baseRate: number;
    ratePlanName: string;
}

export function OccupancyBreakdownModal({
    isOpen,
    onClose,
    baseRate,
    ratePlanId,
    ratePlanCode,
    date
}: OccupancyBreakdownModalProps) {
    const [data, setData] = useState<OccupancyData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            fetchData();
        }
    }, [isOpen]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/v1/admin/ari/occupancy-rates?ratePlanId=${ratePlanId}&baseRate=${baseRate}`, {
                headers: { 'x-hotel-id': 'HOTEL_001' }
            });
            if (!res.ok) throw new Error('Falha ao carregar detalhes de ocupação');
            const result = await res.json();
            setData(result);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!mounted || !isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 px-4">
            <div className="bg-card border border-border/80 shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border/40 bg-secondary/20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <BadgeDollarSign className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-foreground">Conferência de Ocupantes</h3>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold flex items-center gap-1">
                                {ratePlanCode} • {date}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-secondary transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-xs font-semibold text-muted-foreground">Calculando tarifas derivadas...</p>
                        </div>
                    ) : error ? (
                        <div className="py-10 text-center space-y-3">
                            <p className="text-sm font-bold text-destructive">{error}</p>
                            <button onClick={fetchData} className="text-xs text-primary font-bold underline">Tentar novamente</button>
                        </div>
                    ) : data && (
                        <div className="space-y-6">
                            {/* Summary Banner */}
                            <div className="bg-primary/[0.03] border border-primary/10 rounded-xl p-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-primary" />
                                    <span className="text-xs font-bold text-foreground">Tarifa Base (Double):</span>
                                </div>
                                <span className="text-lg font-black text-primary">${baseRate.toFixed(2)}</span>
                            </div>

                            {/* Two Column Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                {/* Adults Column */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 px-1">
                                        <Users className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Adultos</span>
                                    </div>
                                    <div className="bg-secondary/20 rounded-xl border border-border/40 divide-y divide-border/20">
                                        {Object.entries(data.adults).map(([occ, price]) => (
                                            <div key={occ} className={cn(
                                                "flex items-center justify-between p-2.5",
                                                occ === '2' && "bg-primary/5 font-bold"
                                            )}>
                                                <span className="text-xs text-muted-foreground">{occ} Adulto{parseInt(occ) > 1 ? 's' : ''}</span>
                                                <span className="text-xs font-bold text-foreground">${price.toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Children Column */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 px-1">
                                        <Baby className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Crianças</span>
                                    </div>
                                    <div className="bg-secondary/20 rounded-xl border border-border/40 divide-y divide-border/20 min-h-[100px]">
                                        {data.children.length > 0 ? data.children.map((child, idx) => (
                                            <div key={idx} className="flex flex-col p-2.5">
                                                <span className="text-[10px] text-muted-foreground truncate" title={child.label}>{child.label}</span>
                                                <span className="text-xs font-bold text-foreground">${child.price.toFixed(2)}</span>
                                            </div>
                                        )) : (
                                            <div className="h-full flex flex-col items-center justify-center p-4 text-center">
                                                <p className="text-[10px] italic text-muted-foreground/60">Nenhuma faixa de criança ativa para este plano.</p>
                                            </div>
                                        )}
                                    </div>
                                    {data.children.length > 0 && (
                                        <div className="flex items-start gap-1 px-1 mt-2">
                                            <Info className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                                            <p className="text-[9px] text-muted-foreground leading-tight italic">
                                                Valor fixo individual por criança na faixa. Acima de {data.children[data.children.length - 1].label.split('a ')[1]?.split(' ')[0] || '12'} anos conta como adulto.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border/40 bg-secondary/10 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-xs font-bold bg-foreground text-background rounded-lg shadow-lg hover:opacity-90 active:scale-95 transition-all"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
