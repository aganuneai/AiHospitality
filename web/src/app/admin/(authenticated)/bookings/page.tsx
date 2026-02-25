"use client"

import { useState, useEffect, useCallback } from "react"
import { NeoCard, NeoCardContent } from "@/components/neo/neo-card"
import { NeoButton } from "@/components/neo/neo-button"
import {
    NeoTable, NeoTableContainer, NeoTableHeader,
    NeoTableRow, NeoTableHead, NeoTableCell,
    NeoTableLoading, NeoTableEmpty, NeoTableError
} from "@/components/neo/neo-table"
import { useRouter } from "next/navigation"
import { useNeoApi } from "@/hooks/use-neo-api"
import {
    CalendarCheck,
    Download,
    MoreHorizontal,
    ArrowRight,
    LogIn,
    LogOut,
    Bed,
    PieChart,
    Search,
    X,
    User,
    Mail,
    Phone,
    FileText,
    CreditCard
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export default function BookingsPage() {
    const router = useRouter()
    const { loading, error, call } = useNeoApi()
    const [bookings, setBookings] = useState<any[]>([])
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'IN_HOUSE' | 'ARRIVALS' | 'DEPARTURES'>('ALL')
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedBooking, setSelectedBooking] = useState<any | null>(null)

    const fetchBookings = async () => {
        const propertyId = "HOTEL_001"
        const data = await call(fetch(`/api/v1/admin/bookings?propertyId=${propertyId}`))
        if (data) {
            setBookings(data.bookings || [])
        }
    }

    useEffect(() => { fetchBookings() }, [])

    // KPI Calculation (Mock logic based on today's date for demonstration)
    const today = new Date().toISOString().split('T')[0]
    const kpis = {
        arrivals: bookings.filter(b => b.checkIn.startsWith(today) && b.status === 'CONFIRMED').length,
        departures: bookings.filter(b => b.checkOut.startsWith(today) && b.status === 'CHECKED_IN').length,
        inHouse: bookings.filter(b => b.status === 'CHECKED_IN').length,
        occupancy: '72%'
    }

    // Filter Logic
    const filteredBookings = bookings.filter(booking => {
        const matchesSearch =
            booking.pnr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            booking.guest?.primaryGuestName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            booking.roomType?.name?.toLowerCase().includes(searchTerm.toLowerCase())

        if (filterStatus === 'ALL') return matchesSearch
        if (filterStatus === 'ARRIVALS') return matchesSearch && booking.checkIn.startsWith(today) && booking.status === 'CONFIRMED'
        if (filterStatus === 'DEPARTURES') return matchesSearch && booking.checkOut.startsWith(today) && booking.status === 'CHECKED_IN'
        if (filterStatus === 'IN_HOUSE') return matchesSearch && booking.status === 'CHECKED_IN'

        return matchesSearch
    })

    return (
        <div className="space-y-8 animate-in fade-in duration-700 h-full flex flex-col overflow-hidden">
            {/* Premium Header */}
            <div className="flex-none flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-border/40">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight font-heading text-foreground">
                        Painel Operacional
                    </h1>
                    <p className="text-muted-foreground font-medium tracking-wide">
                        Gestão em tempo real de chegadas, partidas e ocupação.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <NeoButton variant="outline" size="sm" className="h-10">
                        <Download className="mr-2 h-4 w-4 text-muted-foreground" />
                        Exportar CSV
                    </NeoButton>
                    <NeoButton
                        onClick={() => router.push('/admin/bookings/new')}
                        className="h-10 bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20"
                    >
                        <CalendarCheck className="mr-2 h-4 w-4" />
                        Nova Reserva
                    </NeoButton>
                </div>
            </div>

            {/* KPIs Section */}
            <div className="flex-none grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Chegadas (Hoje)', value: kpis.arrivals, icon: LogIn, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                    { label: 'Partidas (Hoje)', value: kpis.departures, icon: LogOut, color: 'text-orange-500', bg: 'bg-orange-500/10' },
                    { label: 'Hóspedes em Casa', value: kpis.inHouse, icon: Bed, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                    { label: 'Ocupação Atual', value: kpis.occupancy, icon: PieChart, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
                ].map((kpi, idx) => (
                    <NeoCard key={idx} className="border-border/40 hover:-translate-y-1 transition-transform cursor-default">
                        <NeoCardContent className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{kpi.label}</p>
                                <p className="text-3xl font-black italic tracking-tighter">{kpi.value}</p>
                            </div>
                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", kpi.bg)}>
                                <kpi.icon className={cn("w-6 h-6", kpi.color)} />
                            </div>
                        </NeoCardContent>
                    </NeoCard>
                ))}
            </div>

            {/* Filters & Search */}
            <div className="flex-none flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="bg-secondary/20 p-1 rounded-xl border border-border/40 flex gap-1">
                    {[
                        { id: 'ALL', label: 'Todos' },
                        { id: 'IN_HOUSE', label: 'Em Casa' },
                        { id: 'ARRIVALS', label: 'Chegadas' },
                        { id: 'DEPARTURES', label: 'Partidas' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setFilterStatus(tab.id as any)}
                            className={cn(
                                "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-tighter transition-all",
                                filterStatus === tab.id
                                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Buscar por PNR, Hóspede ou Unidade..."
                        className="w-full h-11 bg-secondary/20 border border-border/40 rounded-xl pl-12 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Main Area with Table and Side Panel */}
            <div className="flex-1 flex gap-6 overflow-hidden min-h-[500px]">
                <div className="flex-1 overflow-hidden">
                    <NeoCard className="border-border/40 h-full overflow-hidden" glass>
                        <NeoCardContent className="p-0 h-full flex flex-col">
                            <NeoTableContainer className="flex-1 overflow-auto">
                                <NeoTable>
                                    <NeoTableHeader>
                                        <NeoTableRow className="bg-secondary/20 border-b border-border/40">
                                            <NeoTableHead className="font-black tracking-widest text-[10px] uppercase py-4">Hóspede / PNR</NeoTableHead>
                                            <NeoTableHead className="font-black tracking-widest text-[10px] uppercase py-4 text-center">In / Out</NeoTableHead>
                                            <NeoTableHead className="font-black tracking-widest text-[10px] uppercase py-4">Acomodação</NeoTableHead>
                                            <NeoTableHead className="font-black tracking-widest text-[10px] uppercase py-4">Valor Total</NeoTableHead>
                                            <NeoTableHead className="font-black tracking-widest text-[10px] uppercase py-4">Status</NeoTableHead>
                                            <NeoTableHead className="text-right font-black tracking-widest text-[10px] uppercase py-4 pr-6">Ações</NeoTableHead>
                                        </NeoTableRow>
                                    </NeoTableHeader>
                                    <tbody className="divide-y divide-border/20">
                                        {loading && <NeoTableLoading rows={8} cols={6} />}
                                        {!loading && filteredBookings.map((booking) => (
                                            <NeoTableRow
                                                key={booking.id}
                                                className={cn(
                                                    "hover:bg-indigo-500/5 transition-all cursor-pointer group border-l-4 border-transparent",
                                                    selectedBooking?.id === booking.id && "bg-indigo-500/10 border-indigo-600"
                                                )}
                                                onClick={() => setSelectedBooking(selectedBooking?.id === booking.id ? null : booking)}
                                            >
                                                <NeoTableCell className="py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center font-black text-indigo-600 italic">
                                                            {booking.guest?.primaryGuestName?.charAt(0)}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-black text-sm tracking-tight">{booking.guest?.primaryGuestName}</span>
                                                            <span className="text-[10px] font-bold text-indigo-600 font-mono">{booking.pnr}</span>
                                                        </div>
                                                    </div>
                                                </NeoTableCell>
                                                <NeoTableCell className="text-center">
                                                    <div className="inline-flex items-center bg-secondary/40 rounded-lg p-2 gap-3 border border-border/40">
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-[8px] font-black uppercase text-muted-foreground leading-none">In</span>
                                                            <span className="text-xs font-black">{new Date(booking.checkIn).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                                                        </div>
                                                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-[8px] font-black uppercase text-muted-foreground leading-none">Out</span>
                                                            <span className="text-xs font-black">{new Date(booking.checkOut).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                                                        </div>
                                                    </div>
                                                </NeoTableCell>
                                                <NeoTableCell>
                                                    <Badge variant="outline" className="rounded-lg bg-background/50 border-border/40 text-[10px] font-black px-3 py-1">
                                                        {booking.roomType?.name}
                                                    </Badge>
                                                </NeoTableCell>
                                                <NeoTableCell className="font-black text-sm text-foreground italic tracking-tighter">
                                                    R$ {booking.total?.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </NeoTableCell>
                                                <NeoTableCell>
                                                    <span className={cn(
                                                        "inline-flex items-center px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all shadow-sm",
                                                        booking.status === 'CONFIRMED' && "text-blue-500 bg-blue-500/10 border-blue-500/20",
                                                        booking.status === 'CHECKED_IN' && "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
                                                        booking.status === 'CANCELLED' && "text-rose-500 bg-rose-500/10 border-rose-500/20"
                                                    )}>
                                                        {booking.status}
                                                    </span>
                                                </NeoTableCell>
                                                <NeoTableCell className="text-right pr-6">
                                                    <button className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </button>
                                                </NeoTableCell>
                                            </NeoTableRow>
                                        ))}
                                    </tbody>
                                </NeoTable>
                            </NeoTableContainer>
                        </NeoCardContent>
                    </NeoCard>
                </div>

                {/* Right Side Panel: Booking Quick Details */}
                <div className={cn(
                    "flex-none transition-all duration-500 overflow-hidden",
                    selectedBooking ? "w-96 opacity-100 translate-x-0" : "w-0 opacity-0 translate-x-full"
                )}>
                    {selectedBooking && (
                        <NeoCard className="h-full border-border/40 flex flex-col bg-secondary/10" glass>
                            <NeoCardContent className="p-8 space-y-8 flex-1 overflow-auto">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-black italic tracking-tighter">Detalhes da Reserva</h2>
                                    <button
                                        onClick={() => setSelectedBooking(null)}
                                        className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Guest Card */}
                                <div className="space-y-4">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                                        <span>Perfil do Hóspede</span>
                                        <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[8px] font-black">VIP</Badge>
                                    </div>
                                    <div className="bg-background/40 p-6 rounded-[2rem] border border-border/40 flex flex-col items-center text-center">
                                        <div className="w-20 h-20 rounded-[2.5rem] bg-indigo-500/10 border-2 border-dashed border-indigo-500/30 flex items-center justify-center mb-4">
                                            <User className="w-8 h-8 text-indigo-500/40" />
                                        </div>
                                        <h3 className="text-lg font-black tracking-tight">{selectedBooking.guest?.primaryGuestName}</h3>
                                        <div className="mt-4 w-full space-y-2">
                                            <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-2xl">
                                                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                                                <span className="text-xs font-bold truncate">{selectedBooking.guest?.email || 'N/A'}</span>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-2xl">
                                                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                                                <span className="text-xs font-bold">{selectedBooking.guest?.phone || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Stay Info */}
                                <div className="space-y-4">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Contexto da Estadia</span>
                                    <div className="bg-background/40 p-6 rounded-[2rem] border border-border/40 space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[8px] font-black uppercase text-muted-foreground">Check-in</label>
                                                <p className="text-sm font-black italic">{new Date(selectedBooking.checkIn).toLocaleDateString('pt-BR')}</p>
                                            </div>
                                            <div>
                                                <label className="text-[8px] font-black uppercase text-muted-foreground">Check-out</label>
                                                <p className="text-sm font-black italic">{new Date(selectedBooking.checkOut).toLocaleDateString('pt-BR')}</p>
                                            </div>
                                        </div>
                                        <div className="pt-4 border-t border-border/40 space-y-1">
                                            <label className="text-[8px] font-black uppercase text-muted-foreground">Observações</label>
                                            <p className="text-xs font-bold text-muted-foreground leading-relaxed italic">
                                                {selectedBooking.notes || "Sem observações registradas."}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="space-y-4">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ações Rápidas</span>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button className="flex flex-col items-center justify-center gap-3 p-5 bg-indigo-600 rounded-[2rem] text-white shadow-lg shadow-indigo-600/20 hover:scale-[1.02] transition-all">
                                            <LogIn className="w-5 h-5" />
                                            <span className="text-[9px] font-black uppercase">Check-in</span>
                                        </button>
                                        <button className="flex flex-col items-center justify-center gap-3 p-5 bg-background/40 border border-border/40 rounded-[2rem] hover:bg-secondary/40 transition-all">
                                            <CreditCard className="w-5 h-5" />
                                            <span className="text-[9px] font-black uppercase">Financeiro</span>
                                        </button>
                                        <button className="flex flex-col items-center justify-center gap-3 p-5 bg-background/40 border border-border/40 rounded-[2rem] hover:bg-secondary/40 transition-all">
                                            <FileText className="w-5 h-5" />
                                            <span className="text-[9px] font-black uppercase">Voucher</span>
                                        </button>
                                        <button className="flex flex-col items-center justify-center gap-3 p-5 bg-background/40 border border-border/40 rounded-[2rem] hover:bg-secondary/40 transition-all">
                                            <MoreHorizontal className="w-5 h-5" />
                                            <span className="text-[9px] font-black uppercase">Outros</span>
                                        </button>
                                    </div>
                                </div>
                            </NeoCardContent>
                        </NeoCard>
                    )}
                </div>
            </div>
        </div>
    )
}
