"use client";

import { useState, useEffect } from "react";
import {
    Search,
    XCircle,
    CheckCircle,
    Clock,
    Loader2,
    CalendarRange,
    ArrowUpRight,
    ArrowDownRight,
    Filter,
    Download
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge"; // Assuming Badge component exists or using inline styles if not

// Mock data types
interface ReservationData {
    id: string;
    pnr: string;
    guest: { fullName: string; email: string };
    roomType?: { code: string; name: string };
    checkIn: string;
    checkOut: string;
    status: string;
    total: { amount: number; currency: string };
    createdAt: string;
}

export default function ReservationsPage() {
    const [reservations, setReservations] = useState<ReservationData[]>([]);
    const [filteredReservations, setFilteredReservations] = useState<ReservationData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchPnr, setSearchPnr] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const { toast } = useToast();

    // Stats (Calculated from data for demo)
    const stats = {
        total: filteredReservations.length,
        confirmed: filteredReservations.filter(r => r.status === 'CONFIRMED').length,
        arrivals: filteredReservations.filter(r => new Date(r.checkIn).toDateString() === new Date().toDateString()).length,
        revenue: filteredReservations.reduce((acc, curr) => acc + curr.total.amount, 0)
    };

    const HOTEL_ID = "hotel123"; // TODO: Context

    useEffect(() => {
        fetchReservations();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [reservations, searchPnr, statusFilter]);

    const fetchReservations = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/v1/bookings', {
                headers: { 'x-hotel-id': HOTEL_ID },
                cache: 'no-store'
            });
            if (!res.ok) throw new Error('Falha ao carregar');
            const data = await res.json();
            setReservations(data.bookings || []);
        } catch (error) {
            toast({ title: "Erro", description: "Falha ao carregar reservas", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...reservations];
        if (searchPnr) {
            const term = searchPnr.toLowerCase();
            filtered = filtered.filter(r =>
                r.pnr.toLowerCase().includes(term) ||
                r.guest.fullName.toLowerCase().includes(term)
            );
        }
        if (statusFilter !== "ALL") filtered = filtered.filter(r => r.status === statusFilter);
        setFilteredReservations(filtered);
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'CONFIRMED': return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
            case 'CANCELLED': return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
            case 'CHECKED_IN': return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800";
            default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700";
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">

            {/* 1. Page Header */}
            <div className="flex items-center justify-between px-8 py-6 bg-white dark:bg-slate-950 border-b border-sidebar-border shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Gestão de Reservas</h1>
                    <p className="text-sm text-muted-foreground mt-1">Gerencie chegadas, saídas e ocupação do hotel.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2 text-muted-foreground">
                        <Download size={16} /> Exportar
                    </Button>
                    <Button onClick={fetchReservations} className="gap-2 bg-primary hover:bg-primary/90">
                        {isLoading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                        Nova Reserva
                    </Button>
                </div>
            </div>

            {/* 2. Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-8 py-6">
                <MetricCard
                    label="Receita Prevista"
                    value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats.revenue)}
                    trend="+12.5%"
                    trendUp={true}
                    icon={ArrowUpRight}
                />
                <MetricCard
                    label="Ocupação"
                    value={`${stats.confirmed} Reservas`}
                    trend="Estável"
                    trendUp={true}
                    icon={CalendarRange}
                />
                <MetricCard
                    label="Check-ins Hoje"
                    value={stats.arrivals.toString()}
                    trend="Aguardando"
                    trendUp={true}
                    icon={Clock}
                />
                <MetricCard
                    label="Cancelamentos"
                    value="0"
                    trend="-2.4%"
                    trendUp={false} // Good for cancellations to be down
                    isInverse={true}
                    icon={XCircle}
                />
            </div>

            {/* 3. Data Table Section */}
            <div className="flex-1 px-8 pb-8 overflow-hidden flex flex-col">
                <div className="bg-white dark:bg-slate-950 rounded-xl border border-sidebar-border shadow-sm flex flex-col flex-1 overflow-hidden">

                    {/* Toolbar */}
                    <div className="p-4 border-b border-sidebar-border flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 flex-1 max-w-lg">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por PNR, Hóspede..."
                                    value={searchPnr}
                                    onChange={(e) => setSearchPnr(e.target.value)}
                                    className="pl-9 bg-slate-50 dark:bg-slate-900 border-none ring-1 ring-sidebar-border focus-visible:ring-primary"
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[180px] bg-slate-50 dark:bg-slate-900 border-none ring-1 ring-sidebar-border">
                                    <div className="flex items-center gap-2">
                                        <Filter size={14} className="text-muted-foreground" />
                                        <SelectValue placeholder="Status" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todos</SelectItem>
                                    <SelectItem value="CONFIRMED">Confirmada</SelectItem>
                                    <SelectItem value="CANCELLED">Cancelada</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-muted-foreground font-semibold sticky top-0 z-10 backdrop-blur-sm">
                                <tr>
                                    <th className="px-6 py-4">Reserva</th>
                                    <th className="px-6 py-4">Hóspede</th>
                                    <th className="px-6 py-4">Período</th>
                                    <th className="px-6 py-4">Quarto</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Valor Total</th>
                                    <th className="px-6 py-4 text-right">#</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-sidebar-border">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center gap-2">
                                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                                <p>Carregando reservas...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredReservations.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                                            Nenhum resultado encontrado.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredReservations.map((res) => (
                                        <tr key={res.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                            <td className="px-6 py-4 font-mono font-medium text-primary">
                                                {res.pnr}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-foreground">{res.guest.fullName}</div>
                                                <div className="text-xs text-muted-foreground">{res.guest.email}</div>
                                            </td>
                                            <td className="px-6 py-4 text-muted-foreground">
                                                <div className="flex flex-col">
                                                    <span>{format(new Date(res.checkIn), "dd MMM", { locale: ptBR })}</span>
                                                    <span className="text-xs opacity-70">
                                                        até {format(new Date(res.checkOut), "dd MMM", { locale: ptBR })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {res.roomType ? (
                                                    <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-xs font-medium">
                                                        {res.roomType.code}
                                                    </span>
                                                ) : <span className="text-muted-foreground">-</span>}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusStyle(res.status)}`}>
                                                    {res.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-semibold text-foreground">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: res.total.currency }).format(res.total.amount)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button variant="ghost" size="icon-xs" className="text-muted-foreground hover:text-primary">
                                                    <ArrowUpRight size={16} />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Context */}
                    <div className="p-4 border-t border-sidebar-border bg-slate-50 dark:bg-slate-900/50 text-xs text-muted-foreground flex justify-between items-center">
                        <span>Mostrando {filteredReservations.length} de {reservations.length} reservas</span>
                        <div className="flex gap-2">
                            <Button variant="outline" size="xs" disabled>Anterior</Button>
                            <Button variant="outline" size="xs" disabled>Próxima</Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper Component for Metrics
function MetricCard({ label, value, trend, trendUp, icon: Icon, isInverse }: any) {
    const isPositive = isInverse ? !trendUp : trendUp;
    const trendColor = isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";

    return (
        <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-sidebar-border shadow-sm flex items-start justify-between">
            <div>
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold mt-1 tracking-tight">{value}</p>
                <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${trendColor}`}>
                    {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {trend}
                </div>
            </div>
            <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-lg text-primary">
                <Icon size={20} />
            </div>
        </div>
    );
}
