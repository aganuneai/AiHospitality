"use client"

import { useNeoFetch } from "@/hooks/use-neo-api"
import { AriGridResponse } from "@/lib/types/ari"
import { NeoCard } from "@/components/neo/neo-card"
import { format, parseISO, addDays } from "date-fns"
import { Loader2, Ban, ShieldAlert, Minus, Filter, ChevronDown, Lock, Plus } from "lucide-react"
import React, { useState } from "react"
import { NeoErrorState } from "@/components/neo/neo-error-state"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { BulkUpdateModal } from "./BulkUpdateModal"
import { AriGridRateCell } from "./AriGridRateCell"
import { CalendarEventModal } from "./CalendarEventModal"

/**
 * AriGridView Component
 * 
 * Renders a high-fidelity tactical matrix of all room types and their ARI status
 * for the selected date range. This is the main operational view for revenue 
 * and front desk managers.
 */
export function AriGridView() {
    const [fromDate, setFromDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
    const [toDate, setToDate] = useState<string>(format(addDays(new Date(), 14), 'yyyy-MM-dd'))
    const [selectedRoomTypes, setSelectedRoomTypes] = useState<string[]>([])
    const [selectedRatePlans, setSelectedRatePlans] = useState<string[]>([])

    // Event Editing State
    const [eventToEdit, setEventToEdit] = useState<any>(null)
    const [isEventModalOpen, setIsEventModalOpen] = useState(false)

    // Fetch filters available
    const { data: rtData } = useNeoFetch<{ roomTypes: { id: string, name: string }[] }>('/api/v1/admin/room-types')
    const { data: rpData } = useNeoFetch<{ ratePlans: { code: string, name: string }[] }>('/api/v1/admin/rate-plans')

    const allRoomTypes = Array.isArray(rtData?.roomTypes) ? rtData.roomTypes : Array.isArray(rtData) ? rtData : []
    const allRatePlans = Array.isArray(rpData?.ratePlans) ? rpData.ratePlans : Array.isArray(rpData) ? rpData : []

    // Build grid query
    const queryParams = new URLSearchParams()
    if (fromDate) queryParams.set('from', fromDate)
    if (toDate) queryParams.set('to', toDate)
    if (selectedRoomTypes.length > 0) queryParams.set('roomTypes', selectedRoomTypes.join(','))
    if (selectedRatePlans.length > 0) queryParams.set('ratePlans', selectedRatePlans.join(','))

    const { data: grid, loading, error, refetch } = useNeoFetch<AriGridResponse>(`/api/v1/admin/ari/grid?${queryParams.toString()}`)

    // Extract unique room types for the Bulk Updater as fallback
    const extractedRoomTypes = grid?.rows ? grid.rows.map(r => ({ id: r.roomTypeId, name: r.roomTypeName })) : []
    const roomTypesToPass = allRoomTypes.length > 0 ? allRoomTypes : extractedRoomTypes

    const isGridReady = grid && grid.rows.length > 0 && !loading && !error;

    const toggleArrayItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
        setter(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item])
    }

    // Extract dates from first row to build header
    const dates = grid?.rows?.[0]?.inventoryDays?.map(d => d.date) || []

    return (
        <NeoCard className="overflow-hidden border border-border/50 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700 bg-background/50 backdrop-blur-xl">

            {/* Header / Actions */}
            <div className="p-6 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-secondary/10">
                <div>
                    <h2 className="text-xl font-bold font-heading text-foreground tracking-tight">Painel de Controle ARI</h2>
                    <p className="text-sm text-muted-foreground mt-1 font-medium">
                        Gerencie Preços, Inventário e Restrições diárias.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 border-primary/20 hover:bg-primary/5 text-xs font-semibold"
                        onClick={() => {
                            setEventToEdit(null)
                            setIsEventModalOpen(true)
                        }}
                    >
                        <Plus className="w-3.5 h-3.5" /> Adicionar Evento
                    </Button>

                    <CalendarEventModal
                        open={isEventModalOpen}
                        setOpen={setIsEventModalOpen}
                        eventToEdit={eventToEdit}
                        onSuccess={() => {
                            setEventToEdit(null)
                            refetch()
                        }}
                    />
                    <BulkUpdateModal roomTypes={roomTypesToPass} ratePlans={allRatePlans} onSuccess={() => refetch()} disabled={!isGridReady || allRatePlans.length === 0} />
                </div>
            </div>

            {/* Filter Bar */}
            <div className="p-4 border-b border-border/40 bg-secondary/5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div className="space-y-1 flex flex-col">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1.5"><Filter className="w-3 h-3" /> Data Inicial</label>
                    <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="h-9 w-full bg-background border border-border/50 rounded-lg text-sm px-3 focus:ring-1 focus:ring-primary outline-none shadow-sm text-foreground" />
                </div>
                <div className="space-y-1 flex flex-col">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Data Final</label>
                    <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="h-9 w-full bg-background border border-border/50 rounded-lg text-sm px-3 focus:ring-1 focus:ring-primary outline-none shadow-sm text-foreground" />
                </div>

                {/* Room Types Filter Multi-select simulation */}
                <div className="space-y-1 flex flex-col relative group">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Tipos de Quarto</label>
                    <button className="h-9 w-full bg-background border border-border/50 rounded-lg text-sm px-3 flex items-center justify-between text-left shadow-sm hover:bg-secondary/20 transition-colors">
                        <span className="truncate text-foreground font-medium">{selectedRoomTypes.length === 0 ? 'Todos os Tipos' : `${selectedRoomTypes.length} selecionado(s)`}</span>
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <div className="absolute top-full left-0 w-full mt-1 bg-popover border border-border/50 shadow-xl rounded-lg p-2 z-50 hidden group-hover:block transition-all max-h-[200px] overflow-auto">
                        {allRoomTypes.map((rt: any) => (
                            <label key={rt.id} className="flex items-center gap-2 p-1.5 hover:bg-secondary/30 rounded cursor-pointer">
                                <input type="checkbox" checked={selectedRoomTypes.includes(rt.id)} onChange={() => toggleArrayItem(setSelectedRoomTypes, rt.id)} className="w-3.5 h-3.5 accent-primary" />
                                <span className="text-sm font-medium text-foreground cursor-pointer">{rt.name}</span>
                            </label>
                        ))}
                        {(!allRoomTypes || allRoomTypes.length === 0) && <span className="text-xs font-semibold text-muted-foreground p-2 block">Nenhum Tipo de Quarto encontrado</span>}
                    </div>
                </div>

                {/* Rate Plans Filter Multi-select simulation */}
                <div className="space-y-1 flex flex-col relative group">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Planos Tarifários</label>
                    <button className="h-9 w-full bg-background border border-border/50 rounded-lg text-sm px-3 flex items-center justify-between text-left shadow-sm hover:bg-secondary/20 transition-colors">
                        <span className="truncate text-foreground font-medium">{selectedRatePlans.length === 0 ? 'Todos os Planos' : `${selectedRatePlans.length} selecionado(s)`}</span>
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <div className="absolute top-full left-0 w-full mt-1 bg-popover border border-border/50 shadow-xl rounded-lg p-2 z-50 hidden group-hover:block transition-all max-h-[200px] overflow-auto">
                        {allRatePlans.map((rp: any) => (
                            <label key={rp.code} className="flex items-center gap-2 p-1.5 hover:bg-secondary/30 rounded cursor-pointer">
                                <input type="checkbox" checked={selectedRatePlans.includes(rp.code)} onChange={() => toggleArrayItem(setSelectedRatePlans, rp.code)} className="w-3.5 h-3.5 accent-primary" />
                                <span className="text-sm font-medium text-foreground cursor-pointer">{rp.name}</span>
                            </label>
                        ))}
                        {(!allRatePlans || allRatePlans.length === 0) && <span className="text-xs font-semibold text-muted-foreground p-2 block">Nenhum Rate Plan encontrado</span>}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center p-24 space-y-6">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    <div className="flex flex-col items-center space-y-1">
                        <span className="text-sm font-bold text-foreground">Carregando Matriz ARI</span>
                        <span className="text-xs text-muted-foreground">Sincronizando inventário com o PMS...</span>
                    </div>
                </div>
            ) : error ? (
                <div className="p-12">
                    <NeoErrorState error={error} onRetry={refetch} />
                </div>
            ) : !isGridReady ? (
                <div className="p-12 text-center border border-dashed border-border/50 bg-secondary/10 rounded-2xl mx-6 mt-6 mb-6">
                    <Minus className="w-8 h-8 mx-auto mb-4 text-muted-foreground/40" />
                    <p className="text-muted-foreground text-sm font-semibold tracking-wide">
                        Nenhum tipo de quarto ativo detectado para esta propriedade.
                    </p>
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr className="bg-secondary/20">
                                    <th className="sticky left-0 z-30 p-5 border-b border-r border-border/40 min-w-[280px] bg-background/95 backdrop-blur-xl shadow-[4px_0_12px_-8px_rgba(0,0,0,0.1)]">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold uppercase tracking-wider text-foreground">Acomodação</span>
                                            <span className="text-[10px] text-muted-foreground font-medium">Categoria / Tipo de Quarto</span>
                                        </div>
                                    </th>
                                    {dates.map((date: string) => {
                                        const dayEvents = grid.events?.filter(e => e.date === date) || [];
                                        const hasHoliday = dayEvents.some(e => e.type === 'HOLIDAY');

                                        return (
                                            <th key={date} className={cn(
                                                "p-4 border-b border-border/40 min-w-[140px] text-center border-r border-border/10 relative",
                                                hasHoliday ? "bg-rose-500/5" : ""
                                            )}>
                                                {/* Event Indicators */}
                                                <div className="absolute top-0 left-0 w-full flex gap-px">
                                                    {dayEvents.map(e => (
                                                        <div
                                                            key={e.id}
                                                            className="h-1 flex-1 cursor-pointer hover:h-2 transition-all"
                                                            style={{ backgroundColor: e.color || '#3b82f6' }}
                                                            title={`${e.title} (Clique para editar)`}
                                                            onClick={(ev) => {
                                                                ev.stopPropagation()
                                                                setEventToEdit(e)
                                                                setIsEventModalOpen(true)
                                                            }}
                                                        />
                                                    ))}
                                                </div>

                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                                        {format(parseISO(date), 'EEE')}
                                                    </span>
                                                    <div className={cn(
                                                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                                                        hasHoliday ? "bg-rose-500 text-white" : "bg-secondary/50 text-foreground"
                                                    )}>
                                                        {format(parseISO(date), 'dd')}
                                                    </div>
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[10px] uppercase font-medium text-muted-foreground">
                                                            {format(parseISO(date), 'MMM')}
                                                        </span>
                                                        {dayEvents.length > 0 && (
                                                            <span
                                                                className="text-[8px] font-bold text-primary truncate max-w-[100px] mt-0.5 cursor-pointer hover:underline"
                                                                title={dayEvents.map(e => e.title).join(', ')}
                                                                onClick={() => {
                                                                    setEventToEdit(dayEvents[0])
                                                                    setIsEventModalOpen(true)
                                                                }}
                                                            >
                                                                {dayEvents[0].title}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {/* Summary Line: Property-wide Occupancy */}
                                <tr className="bg-primary/5 border-b-2 border-primary/20 hover:bg-primary/10 transition-colors">
                                    <td className="sticky left-0 z-30 p-5 border-r border-border/40 bg-primary/10 backdrop-blur-xl shadow-[4px_0_12px_-8px_rgba(0,0,0,0.1)]">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold uppercase tracking-wider text-primary">Ocupação Propriedade</span>
                                            <span className="text-[10px] text-muted-foreground font-medium">Absoluto e Percentual</span>
                                        </div>
                                    </td>
                                    {grid.summary?.map((s) => (
                                        <td key={s.date} className="p-2 text-center border-r border-border/10 align-middle">
                                            <div className="flex flex-col items-center justify-center gap-1">
                                                <span className="text-[11px] font-bold text-foreground">{s.totalAvailable.toString().padStart(2, '0')} / {s.totalInventory.toString().padStart(2, '0')}</span>
                                                <div className={cn(
                                                    "text-[10px] font-bold px-2 py-0.5 rounded-full",
                                                    s.occupancyPct > 85 ? "bg-rose-500 text-white" :
                                                        s.occupancyPct < 40 ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                                                )}>
                                                    {s.occupancyPct.toFixed(0)}%
                                                </div>
                                            </div>
                                        </td>
                                    ))}
                                </tr>

                                {grid.rows.map((row) => (
                                    <React.Fragment key={row.roomTypeId}>
                                        {/* Master Row: Room Type & Inventory */}
                                        <tr className="bg-background/80 hover:bg-primary/5 transition-all group/row">
                                            <td className="sticky left-0 z-20 p-5 border-r border-border/40 bg-background/95 backdrop-blur-xl shadow-[4px_0_12px_-8px_rgba(0,0,0,0.1)]">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-sm font-bold text-foreground group-hover/row:text-primary transition-colors">{row.roomTypeName}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md font-semibold tracking-wide">{row.roomTypeCode}</span>
                                                        <span className="text-[10px] text-muted-foreground font-medium">ID: {row.roomTypeId.slice(0, 8)}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            {row.inventoryDays.map((day) => (
                                                <td key={day.date} className={cn(
                                                    "p-2 text-center border-r border-b border-border/10 transition-all align-middle",
                                                    day.available === 0 ? "bg-rose-500/5" : "hover:bg-primary/5"
                                                )}>
                                                    <div className="flex flex-col items-center justify-center w-full h-full">
                                                        {(() => {
                                                            const occupancyPct = day.total > 0 ? ((day.total - day.available) / day.total) : 0;
                                                            let heatClass = "";
                                                            let tooltip = "";

                                                            if (day.available === 0) {
                                                                heatClass = "text-rose-600 bg-rose-500/10 border-rose-500/30";
                                                                tooltip = "Lotação Esgotada (100%)";
                                                            } else if (occupancyPct > 0.85) {
                                                                heatClass = "text-rose-700 bg-rose-100 border-rose-200 dark:bg-rose-900/30 dark:border-rose-900/50";
                                                                tooltip = `Ocupação Crítica (${(occupancyPct * 100).toFixed(1)}%). Recomendado: Aumentar Tarifas (Yield Up)`;
                                                            } else if (occupancyPct < 0.40) {
                                                                heatClass = "text-emerald-700 bg-emerald-100 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-900/50";
                                                                tooltip = `Ocupação Baixa (${(occupancyPct * 100).toFixed(1)}%). Recomendado: Criar Promoções`;
                                                            } else {
                                                                heatClass = "text-amber-700 bg-amber-100 border-amber-200 dark:bg-amber-900/30 dark:border-amber-900/50";
                                                                tooltip = `Ocupação Normal/Alta (${(occupancyPct * 100).toFixed(1)}%)`;
                                                            }

                                                            return (
                                                                <div
                                                                    title={tooltip}
                                                                    className={cn(
                                                                        "w-full py-1 rounded-md shadow-sm transition-all border cursor-help flex flex-col items-center justify-center",
                                                                        heatClass
                                                                    )}
                                                                >
                                                                    <span className="text-[11px] font-bold">
                                                                        {day.available.toString().padStart(2, '0')} / {day.total.toString().padStart(2, '0')}
                                                                    </span>
                                                                    <span className="text-[9px] opacity-80 font-semibold">
                                                                        {(occupancyPct * 100).toFixed(0)}%
                                                                    </span>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>

                                        {/* Rate Lines Sub-rows */}
                                        {row.rateLines.map((rateLine) => (
                                            <tr key={`${row.roomTypeId}-${rateLine.ratePlanCode}`} className="bg-secondary/5 hover:bg-secondary/10 transition-all group/subrow border-b border-border/20 last:border-b-2 last:border-border/40">
                                                <td className="sticky left-0 z-20 px-5 py-3 border-r border-border/40 bg-secondary/30 backdrop-blur-xl">
                                                    <div className="flex items-center pl-4 gap-2 border-l-2 border-primary/30">
                                                        <span className="text-[11px] font-semibold text-muted-foreground">{rateLine.ratePlanName}</span>
                                                        <span className="text-[9px] px-1.5 rounded bg-background border border-border/50 text-muted-foreground">{rateLine.ratePlanCode}</span>
                                                    </div>
                                                </td>
                                                {rateLine.days.map((day) => (
                                                    <td key={day.date} className="px-2 py-3 text-center border-r border-border/10 transition-all relative group/cell">
                                                        <div className="flex flex-col items-center gap-1.5 relative z-10 w-full">
                                                            {/* Tactical Rate with Inline Editing */}
                                                            <AriGridRateCell
                                                                date={day.date}
                                                                roomTypeId={row.roomTypeId}
                                                                ratePlanCode={rateLine.ratePlanCode}
                                                                initialRate={day.rate}
                                                                isDerived={rateLine.parentRatePlanId !== null}
                                                                isManualOverride={day.isManualOverride}
                                                                onUpdateSuccess={refetch}
                                                            />

                                                            {/* Restrictions Badges */}
                                                            <div className="flex flex-wrap justify-center gap-1 mt-0.5 min-h-[16px]">
                                                                {day.restrictions.closed ? (
                                                                    <div className="bg-rose-500/10 border border-rose-500/20 px-1 rounded text-[9px] font-bold text-rose-500 flex items-center gap-0.5">
                                                                        <Ban className="w-2.5 h-2.5" /> FECH
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        {day.restrictions.closedToArrival && (
                                                                            <div className="bg-amber-500/10 border border-amber-500/20 px-1 rounded text-[8px] font-bold text-amber-500" title="Closed to Arrival">
                                                                                CTA
                                                                            </div>
                                                                        )}
                                                                        {day.restrictions.closedToDeparture && (
                                                                            <div className="bg-amber-500/10 border border-amber-500/20 px-1 rounded text-[8px] font-bold text-amber-500" title="Closed to Departure">
                                                                                CTD
                                                                            </div>
                                                                        )}
                                                                        {day.restrictions.minLOS && (
                                                                            <div className="bg-blue-500/10 border border-blue-500/20 px-1.5 rounded text-[9px] font-bold text-blue-500" title={`Min. Length of Stay: ${day.restrictions.minLOS}`}>
                                                                                Min {day.restrictions.minLOS}N
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {/* Hover Marker */}
                                                        <div className="absolute inset-0 border-2 border-transparent group-hover/cell:border-primary/20 pointer-events-none rounded transition-all" />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Legend / Status Footer */}
                    <div className="px-6 py-4 bg-secondary/20 border-t border-border/40 flex items-center justify-between">
                        <div className="flex flex-wrap gap-4 sm:gap-6">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" />
                                <span className="text-[11px] font-semibold text-foreground">Disp. Aberta</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-amber-500 shadow-sm" />
                                <span className="text-[11px] font-semibold text-foreground">Baixa Disp. {`(< 3)`}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-rose-500 shadow-sm" />
                                <span className="text-[11px] font-semibold text-foreground">Sem vagas (0)</span>
                            </div>
                            <div className="w-px h-4 bg-border/50 hidden sm:block" />
                            <div className="flex items-center gap-2">
                                <div className="bg-amber-500/10 border border-amber-500/20 px-1 rounded text-[8px] font-bold text-amber-500">CTA</div>
                                <span className="text-[11px] font-semibold text-foreground">Fechado Chegada</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="bg-amber-500/10 border border-amber-500/20 px-1 rounded text-[8px] font-bold text-amber-500">CTD</div>
                                <span className="text-[11px] font-semibold text-foreground">Fechado Saída</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-rose-500">FECH</span>
                                <span className="text-[11px] font-semibold text-foreground">Stop-Sell Restrito</span>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </NeoCard>
    )
}
