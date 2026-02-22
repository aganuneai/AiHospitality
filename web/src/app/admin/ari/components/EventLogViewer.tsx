'use client';

import React, { useState, Fragment } from 'react';
import { useEventLog } from '../hooks/useEventLog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, ChevronDown, ChevronUp, Filter, Calendar, Undo2, Loader2 } from 'lucide-react';
import { useNeoFetch, useNeoMutation } from '@/hooks/use-neo-api';
import { useToast } from '@/hooks/use-toast';

export function EventLogViewer() {
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [typeFilter, setTypeFilter] = useState<string>('ALL');
    const [roomTypeFilter, setRoomTypeFilter] = useState<string>('ALL');
    const [ratePlanFilter, setRatePlanFilter] = useState<string>('ALL');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    // Expanded rows state
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

    // Fetch lists for filters
    const { data: rtData } = useNeoFetch<{ roomTypes: { code: string, name: string }[] }>('/api/v1/admin/room-types');
    const { data: rpData } = useNeoFetch<{ ratePlans: { code: string, name: string }[] }>('/api/v1/admin/rate-plans');
    const { toast } = useToast();

    const { mutate: undoMutate, loading: undoLoading } = useNeoMutation('/api/v1/admin/ari/undo', {
        onSuccess: () => {
            toast({
                title: "Sucesso",
                description: "Alteração desfeita com sucesso!",
            });
            refetch();
        }
    });

    const allRoomTypes = Array.isArray(rtData?.roomTypes) ? rtData.roomTypes : Array.isArray(rtData) ? rtData : [];
    const allRatePlans = Array.isArray(rpData?.ratePlans) ? rpData.ratePlans : Array.isArray(rpData) ? rpData : [];

    const { events, loading, error, refetch } = useEventLog({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        eventType: typeFilter === 'ALL' ? undefined : typeFilter,
        roomTypeCode: roomTypeFilter === 'ALL' ? undefined : roomTypeFilter,
        ratePlanCode: ratePlanFilter === 'ALL' ? undefined : ratePlanFilter,
        startDate: startDate || undefined,
        endDate: endDate || undefined
    });

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: any; label: string }> = {
            APPLIED: { variant: 'default', label: 'Aplicado' },
            PENDING: { variant: 'secondary', label: 'Pendente' },
            ERROR: { variant: 'destructive', label: 'Erro' },
            DEDUPED: { variant: 'outline', label: 'Duplicado' }
        };

        const config = variants[status] || { variant: 'secondary', label: status };

        return (
            <Badge variant={config.variant as any}>
                {config.label}
            </Badge>
        );
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    };

    const toggleRow = (eventId: string) => {
        setExpandedRows(prev => ({ ...prev, [eventId]: !prev[eventId] }));
    };

    const renderPayloadChips = (payload: any) => {
        if (!payload) return <span className="text-gray-400 italic">Payload vazio</span>;

        const chips = [];

        // Generic mapping of known ARI parameters to Portuguese readable badges
        if (payload.rate !== undefined) chips.push(<Badge key="rate" variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Tarifa: ${payload.rate}</Badge>);
        if (payload.price !== undefined) chips.push(<Badge key="price" variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Tarifa: ${payload.price}</Badge>);
        if (payload.amount !== undefined) chips.push(<Badge key="amount" variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Tarifa: ${payload.amount}</Badge>);

        if (payload.available !== undefined) chips.push(<Badge key="available" variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Disponibilidade: {payload.available}</Badge>);
        if (payload.total !== undefined) chips.push(<Badge key="total" variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Total Físico: {payload.total}</Badge>);

        if (payload.restrictions) {
            if (payload.restrictions.closed !== undefined) chips.push(<Badge key="closed" variant="outline" className={payload.restrictions.closed ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-gray-50 text-gray-600"}>Fechado: {payload.restrictions.closed ? 'Sim' : 'Não'}</Badge>);
            if (payload.restrictions.minLOS !== undefined) chips.push(<Badge key="minlos" variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Min. Noites: {payload.restrictions.minLOS}</Badge>);
            if (payload.restrictions.maxLOS !== undefined) chips.push(<Badge key="maxlos" variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Max. Noites: {payload.restrictions.maxLOS}</Badge>);
            if (payload.restrictions.closedToArrival !== undefined) chips.push(<Badge key="cta" variant="outline" className={payload.restrictions.closedToArrival ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-gray-50 text-gray-600"}>CTA: {payload.restrictions.closedToArrival ? 'Sim' : 'Não'}</Badge>);
            if (payload.restrictions.closedToDeparture !== undefined) chips.push(<Badge key="ctd" variant="outline" className={payload.restrictions.closedToDeparture ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-gray-50 text-gray-600"}>CTD: {payload.restrictions.closedToDeparture ? 'Sim' : 'Não'}</Badge>);
        }

        if (chips.length === 0) {
            // Fallback for unknown payload shapes
            return <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded border">{JSON.stringify(payload, null, 2)}</pre>;
        }

        return <div className="flex flex-wrap gap-2">{chips}</div>;
    };

    if (error) {
        return (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">Erro ao carregar eventos: {error}</p>
                <Button onClick={() => refetch()} className="mt-2">
                    Tentar Novamente
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="bg-secondary/5 border rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Data Inicial</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 w-full bg-background border rounded-md text-sm px-3" />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Data Final</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 w-full bg-background border rounded-md text-sm px-3" />
                </div>

                <div className="space-y-1 relative group z-30">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Filter className="w-3 h-3" /> Quarto</label>
                    <Select value={roomTypeFilter} onValueChange={setRoomTypeFilter}>
                        <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Qualquer" />
                        </SelectTrigger>
                        <SelectContent className="z-50 bg-background border shadow-lg">
                            <SelectItem value="ALL">Qualquer Quarto</SelectItem>
                            {allRoomTypes.map((rt: any) => (
                                <SelectItem key={rt.code} value={rt.code}>{rt.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1 relative group z-20">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Filter className="w-3 h-3" /> Tarifa</label>
                    <Select value={ratePlanFilter} onValueChange={setRatePlanFilter}>
                        <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Qualquer" />
                        </SelectTrigger>
                        <SelectContent className="z-50 bg-background border shadow-lg">
                            <SelectItem value="ALL">Qualquer Plano</SelectItem>
                            {allRatePlans.map((rp: any) => (
                                <SelectItem key={rp.code} value={rp.code}>{rp.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1 relative group z-10">
                    <label className="text-xs font-semibold text-muted-foreground">Tipo de Evento</label>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Qualquer" />
                        </SelectTrigger>
                        <SelectContent className="z-50 bg-background border shadow-lg">
                            <SelectItem value="ALL">Todos os Tipos</SelectItem>
                            <SelectItem value="AVAILABILITY">Disponibilidade</SelectItem>
                            <SelectItem value="RATE">Tarifa</SelectItem>
                            <SelectItem value="RESTRICTION">Restrição</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1 relative flex items-end justify-between">
                    <div className="w-[85%]">
                        <label className="text-xs font-semibold text-muted-foreground block mb-1">Status</label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="bg-background">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent className="z-50 bg-background border shadow-lg">
                                <SelectItem value="ALL">Todos</SelectItem>
                                <SelectItem value="APPLIED">Aplicados</SelectItem>
                                <SelectItem value="ERROR">Erros</SelectItem>
                                <SelectItem value="PENDING">Pendentes</SelectItem>
                                <SelectItem value="DEDUPED">Duplicados</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Button variant="outline" size="icon" onClick={() => refetch()} disabled={loading} className="shrink-0 h-9 w-9 bg-background">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
                    </Button>
                </div>
            </div>

            {/* Events Table */}
            <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium text-xs text-muted-foreground uppercase tracking-wider">Expandir</th>
                            <th className="px-4 py-3 text-left font-medium text-xs text-muted-foreground uppercase tracking-wider">Data / Hora</th>
                            <th className="px-4 py-3 text-left font-medium text-xs text-muted-foreground uppercase tracking-wider">Tipo</th>
                            <th className="px-4 py-3 text-left font-medium text-xs text-muted-foreground uppercase tracking-wider">Room Type</th>
                            <th className="px-4 py-3 text-left font-medium text-xs text-muted-foreground uppercase tracking-wider">Rate Plan</th>
                            <th className="px-4 py-3 text-left font-medium text-xs text-muted-foreground uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-left font-medium text-xs text-muted-foreground uppercase tracking-wider">Canal</th>
                            <th className="px-4 py-3 text-right font-medium text-xs text-muted-foreground uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {events.length === 0 && !loading ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                    Nenhum evento encontrado
                                </td>
                            </tr>
                        ) : null}

                        {loading && events.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                    Carregando eventos...
                                </td>
                            </tr>
                        ) : null}

                        {events.map((event) => (
                            <Fragment key={event.eventId}>
                                <tr
                                    className={`border-b transition-colors cursor-pointer hover:bg-secondary/10 ${expandedRows[event.eventId] ? 'bg-secondary/5' : ''}`}
                                    onClick={() => toggleRow(event.eventId)}
                                >
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {expandedRows[event.eventId] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-foreground font-medium">
                                        {formatDate(event.occurredAt)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">{event.eventType}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-foreground font-medium">
                                        {event.roomTypeCode}
                                    </td>
                                    <td className="px-4 py-3 text-foreground font-medium">
                                        {event.ratePlanCode || <span className="text-muted-foreground italic text-xs">Genérico</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        {getStatusBadge(event.status)}
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground text-xs font-mono">
                                        {event.channelCode || 'SYSTEM-BULK'}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {event.status === 'ERROR' && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-xs"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    alert('Retry feature coming soon');
                                                }}
                                            >
                                                Retry
                                            </Button>
                                        )}
                                    </td>
                                </tr>

                                {/* Expandable Detail Row */}
                                {expandedRows[event.eventId] && (
                                    <tr className="bg-secondary/5 border-b border-border/40">
                                        <td colSpan={8} className="p-0">
                                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-top-2 duration-200">

                                                {/* Meta Info Panel */}
                                                <div className="space-y-4">
                                                    <div>
                                                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Detalhes da Transação</h4>
                                                        <div className="bg-background rounded-md border p-3 flex flex-col gap-2">
                                                            <div className="flex justify-between items-center text-sm border-b pb-2">
                                                                <span className="text-muted-foreground">Event ID Rastreio</span>
                                                                <span className="font-mono text-xs font-semibold select-all">{event.eventId}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center text-sm pt-1">
                                                                <span className="text-muted-foreground">Período Afetado no PMS</span>
                                                                {event.dateRange?.from ? (
                                                                    <div className="flex items-center gap-1.5 text-foreground font-medium bg-secondary px-2 py-0.5 rounded">
                                                                        <Calendar className="w-3.5 h-3.5 text-primary" />
                                                                        <span>{event.dateRange.from}</span>
                                                                        <span className="text-muted-foreground mx-1 text-xs">até</span>
                                                                        <span>{event.dateRange.to}</span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-muted-foreground italic text-xs">N/I</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {event.payload?._previousInventories || event.payload?._previousRates ? (
                                                        <Button
                                                            variant="outline"
                                                            className="w-full flex items-center justify-center gap-2 border-primary/30 text-primary font-bold hover:bg-primary/5"
                                                            disabled={undoLoading || event.payload?._undoneAt}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                undoMutate({ eventId: event.eventId });
                                                            }}
                                                        >
                                                            {undoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />}
                                                            {event.payload?._undoneAt ? 'Alteração já foi desfeita' : 'Desfazer Esta Alteração'}
                                                        </Button>
                                                    ) : (
                                                        <div className="text-[10px] text-muted-foreground italic bg-secondary/20 p-2 rounded border border-dashed text-center">
                                                            Este evento não suporta undo transacional.
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Payload / Values Changed */}
                                                <div className="space-y-4">
                                                    <div>
                                                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Valores Exatos Aplicados (Payload)</h4>
                                                        <div className="bg-background rounded-md border p-4 shadow-sm">
                                                            <div className="mb-2 text-xs text-muted-foreground">Os seguintes valores substituíram o histórico vigente para as datas afetadas:</div>
                                                            {renderPayloadChips(event.payload)}
                                                        </div>
                                                    </div>
                                                </div>

                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="text-sm text-gray-500 text-center">
                Mostrando {events.length} evento(s)
            </div>
        </div>
    );
}
