import React, { useState, useRef, useEffect } from 'react';
import { Eye, Loader2, Lock, Sparkles, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { createPortal } from 'react-dom';
import { OccupancyBreakdownModal } from './OccupancyBreakdownModal';

interface AriGridRateCellProps {
    date: string;
    roomTypeId: string;
    ratePlanId: string;
    ratePlanCode: string;
    initialRate: number | null;
    isDerived: boolean;
    isManualOverride?: boolean;
    onUpdateSuccess?: () => void;
}

export function AriGridRateCell({
    date,
    roomTypeId,
    ratePlanId,
    ratePlanCode,
    initialRate,
    isDerived,
    isManualOverride = false,
    onUpdateSuccess
}: AriGridRateCellProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [rate, setRate] = useState<string>(initialRate !== null ? initialRate.toFixed(2) : '');
    const [isSaving, setIsSaving] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [mounted, setMounted] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    // Portal support
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Close context menu on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
                setContextMenu(null);
            }
        };
        if (contextMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [contextMenu]);

    // Focus input when editing starts
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSave = async () => {
        const newRateVal = parseFloat(rate);
        const oldRateVal = initialRate !== null ? initialRate : 0;

        // If no change or invalid, just cancel
        if (isNaN(newRateVal) || newRateVal === oldRateVal || (initialRate === null && rate === '')) {
            setRate(initialRate !== null ? initialRate.toFixed(2) : '');
            setIsEditing(false);
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch('/api/v1/admin/ari/single-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date,
                    roomTypeId,
                    ratePlanCode,
                    field: 'price',
                    value: newRateVal
                })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.details || errorData.error || 'Falha ao atualizar tarifa');
            }

            toast({
                title: isManualOverride ? "Tarifa Manual Atualizada" : "Override Aplicado",
                description: isDerived ? "Esta tarifa agora tem prioridade manual sobre o plano pai." : `A diária para ${date} foi salva.`,
            });

            if (onUpdateSuccess) onUpdateSuccess();
        } catch (error: any) {
            console.error(error);
            // Revert optimistically
            setRate(initialRate !== null ? initialRate.toFixed(2) : '');
            toast({
                variant: 'destructive',
                title: "Erro ao atualizar",
                description: error.message || "Não foi possível salvar a nova tarifa.",
            });
        } finally {
            setIsSaving(false);
            setIsEditing(false);
        }
    };

    const handleClear = async () => {
        setShowConfirm(false);
        setContextMenu(null);
        setIsSaving(true);
        try {
            const res = await fetch('/api/v1/admin/ari/single-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date,
                    roomTypeId,
                    ratePlanCode,
                    field: 'clear_price',
                    value: null
                })
            });

            if (!res.ok) throw new Error('Falha ao limpar tarifa');

            toast({
                title: "Override Removido",
                description: "A tarifa voltou a ser calculada automaticamente.",
            });

            // Trigger parent refresh
            if (onUpdateSuccess) onUpdateSuccess();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: "Erro ao limpar",
                description: error.message || "Não foi possível remover o override.",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        if (!isManualOverride || isSaving) return;
        e.preventDefault();
        e.stopPropagation(); // Avoid bubbling
        setContextMenu({ x: e.clientX, y: e.clientY });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            setRate(initialRate !== null ? initialRate.toFixed(2) : '');
            setIsEditing(false);
        }
    };

    if (isEditing) {
        return (
            <div className="flex flex-col items-center w-full px-1 py-1 rounded-md bg-background border border-primary shadow-inner">
                <input
                    ref={inputRef}
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full text-center text-sm font-bold text-foreground bg-transparent outline-none h-6"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    disabled={isSaving}
                />
            </div>
        );
    }

    return (
        <div
            className={cn(
                "flex flex-col items-center w-full px-2 py-1 rounded-md bg-background/80 border border-border/50 shadow-sm transition-all relative",
                "cursor-text hover:border-primary/50 hover:bg-background group/subrow-hover",
                isDerived && !isManualOverride && "bg-blue-500/5 border-blue-500/10",
                isManualOverride && "bg-amber-500/5 border-amber-500/30"
            )}
            onClick={(e) => {
                if (!isSaving && !contextMenu && !showConfirm) {
                    setIsEditing(true);
                }
            }}
            onContextMenu={handleContextMenu}
            title={isDerived && !isManualOverride
                ? "Calculada automaticamente (Derivada). Clique para criar override manual."
                : isManualOverride
                    ? "Override Manual Ativo. Botão direito para limpar."
                    : "Clique para editar tarifa"
            }
        >
            <div className="flex items-center gap-1 mb-0.5 min-h-[14px]">
                {isDerived && !isManualOverride && <Sparkles className="w-2.5 h-2.5 text-blue-500/60" />}
                {isManualOverride && <Lock className="w-2.5 h-2.5 text-amber-600/60" />}
                <span className={cn(
                    "text-[9px] font-semibold text-muted-foreground uppercase tracking-widest hidden group-hover/subrow-hover:block",
                    isManualOverride && "text-amber-700/60"
                )}>
                    {isManualOverride ? "MANUAL" : isDerived ? "DERIVADA" : "DIÁRIA"}
                </span>
            </div>
            {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary my-1" />
            ) : (
                <div className="flex items-center gap-1.5 py-0.5">
                    <span className={cn(
                        "text-sm font-bold tracking-tight",
                        isManualOverride ? "text-amber-700" : isDerived ? "text-blue-700" : "text-foreground"
                    )}>
                        {initialRate !== null && initialRate !== undefined ? `$${initialRate.toFixed(2)}` : '-'}
                    </span>

                    {initialRate !== null && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowBreakdown(true);
                            }}
                            className="p-1 rounded hover:bg-secondary text-muted-foreground/40 hover:text-primary transition-colors opacity-0 group-hover/subrow-hover:opacity-100"
                            title="Ver detalhes de ocupantes"
                        >
                            <Eye className="w-3 h-3" />
                        </button>
                    )}
                </div>
            )}

            {/* Occupancy Breakdown Modal */}
            <OccupancyBreakdownModal
                isOpen={showBreakdown}
                onClose={() => setShowBreakdown(false)}
                baseRate={initialRate || 0}
                ratePlanId={ratePlanId}
                ratePlanCode={ratePlanCode}
                date={date}
            />

            {/* Context Menu with Portal */}
            {mounted && contextMenu && !showConfirm && createPortal(
                <div
                    ref={contextMenuRef}
                    className="fixed z-[9999] bg-card border border-border shadow-2xl rounded-lg py-1 min-w-[210px] animate-in fade-in zoom-in-95 duration-100 pointer-events-auto"
                    style={{
                        top: Math.min(contextMenu.y, (window.innerHeight || 800) - 100),
                        left: Math.min(contextMenu.x, (window.innerWidth || 1200) - 220)
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowConfirm(true);
                            setContextMenu(null); // Close menu
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors"
                    >
                        <Trash2 className="w-3.5 h-3.5" /> Limpar Override Manual
                    </button>
                    <div className="h-px bg-border/50 my-1" />
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setContextMenu(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary/50 transition-colors"
                    >
                        <X className="w-3.5 h-3.5" /> Fechar
                    </button>
                </div>,
                document.body
            )}

            {/* Confirmation Modal with Portal */}
            {mounted && showConfirm && createPortal(
                <div
                    className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowConfirm(false);
                    }}
                >
                    <div
                        className="bg-card border border-border shadow-2xl rounded-xl p-6 max-w-[340px] animate-in zoom-in-95 duration-200 shadow-black/40 ring-1 ring-border"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-4 mb-5">
                            <div className="w-12 h-12 shrink-0 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                                <Trash2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-foreground">Limpar valor manual?</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">
                                    O valor voltará a ser calculado automaticamente. Esta ação removerá a trava de Revenue Management para esta data.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 mt-6">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowConfirm(false);
                                }}
                                className="px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-secondary rounded-lg transition-colors border border-border/50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleClear();
                                }}
                                className="px-4 py-2 text-xs font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg shadow-lg shadow-destructive/20 transition-all active:scale-95"
                            >
                                Confirmar Limpeza
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
