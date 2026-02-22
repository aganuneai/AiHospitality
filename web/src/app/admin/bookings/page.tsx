"use client"

import { useState, useEffect } from "react"
import { NeoCard, NeoCardContent } from "@/components/neo/neo-card"
import { NeoButton } from "@/components/neo/neo-button"
import {
    NeoTable, NeoTableContainer, NeoTableHeader,
    NeoTableRow, NeoTableHead, NeoTableCell,
    NeoTableLoading, NeoTableEmpty, NeoTableError
} from "@/components/neo/neo-table"
import { useRouter } from "next/navigation"
import { useNeoApi } from "@/hooks/use-neo-api"
import { CalendarCheck, Download, MoreHorizontal, ArrowRight } from "lucide-react"

export default function BookingsPage() {
    const router = useRouter()
    const { loading, error, call } = useNeoApi()
    const [bookings, setBookings] = useState<any[]>([])

    const fetchBookings = async () => {
        const propertyId = "HOTEL_001"
        const data = await call(fetch(`/api/v1/admin/bookings?propertyId=${propertyId}`))
        if (data) {
            setBookings(data.bookings || [])
        }
    }

    useEffect(() => { fetchBookings() }, [])

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Premium Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/40">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight font-heading text-foreground">
                        Gestão de Reservas
                    </h1>
                    <p className="text-muted-foreground font-medium tracking-wide">
                        Monitoramento em tempo real do quadro de reservas.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="inline-flex h-10 items-center justify-center rounded-lg border border-border/50 bg-secondary/30 px-4 py-2 text-sm font-semibold text-foreground transition-all hover:bg-secondary hover:text-foreground">
                        <Download className="mr-2 h-4 w-4 text-muted-foreground" />
                        Exportar CSV
                    </button>
                    <button
                        onClick={() => router.push('/admin/bookings/new')}
                        className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:-translate-y-0.5"
                    >
                        <CalendarCheck className="mr-2 h-4 w-4" />
                        Nova Reserva
                    </button>
                </div>
            </div>

            <NeoCard className="border-t-4 border-t-primary shadow-sm" glass>
                <NeoCardContent className="p-0">
                    <NeoTableContainer>
                        <NeoTable>
                            <NeoTableHeader>
                                <NeoTableRow className="bg-secondary/20">
                                    <NeoTableHead className="font-bold tracking-wider text-xs uppercase">PNR</NeoTableHead>
                                    <NeoTableHead className="font-bold tracking-wider text-xs uppercase">Hóspede</NeoTableHead>
                                    <NeoTableHead className="font-bold tracking-wider text-xs uppercase">Datas (In / Out)</NeoTableHead>
                                    <NeoTableHead className="font-bold tracking-wider text-xs uppercase">Acomodação</NeoTableHead>
                                    <NeoTableHead className="font-bold tracking-wider text-xs uppercase">Total</NeoTableHead>
                                    <NeoTableHead className="font-bold tracking-wider text-xs uppercase">Status</NeoTableHead>
                                    <NeoTableHead className="text-right font-bold tracking-wider text-xs uppercase">Ações</NeoTableHead>
                                </NeoTableRow>
                            </NeoTableHeader>
                            <tbody>
                                {loading && <NeoTableLoading rows={5} cols={7} />}
                                {!loading && error && (
                                    <NeoTableError
                                        colSpan={7}
                                        severity={error.severity}
                                        code={error.code}
                                        title="Erro ao carregar reservas"
                                        message={error.message}
                                        onRetry={fetchBookings}
                                    />
                                )}
                                {!loading && !error && bookings.length === 0 && (
                                    <NeoTableEmpty
                                        colSpan={7}
                                        title="Nenhuma reserva encontrada"
                                        message="Crie a primeira reserva para iniciar a operação."
                                        actionLabel="Criar Reserva"
                                        onAction={() => router.push('/admin/bookings/new')}
                                    />
                                )}
                                {!loading && !error && bookings.map((booking) => (
                                    <NeoTableRow key={booking.id} className="hover:bg-primary/5 transition-colors cursor-pointer group">
                                        <NeoTableCell className="font-mono text-sm font-bold text-primary group-hover:text-primary transition-colors">
                                            {booking.pnr}
                                        </NeoTableCell>
                                        <NeoTableCell>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm text-foreground">{booking.guest?.primaryGuestName}</span>
                                                <span className="text-xs text-muted-foreground">{booking.guest?.email}</span>
                                            </div>
                                        </NeoTableCell>
                                        <NeoTableCell>
                                            <div className="flex flex-col text-sm font-medium">
                                                <span className="text-foreground">{new Date(booking.checkIn).toLocaleDateString('pt-BR')}</span>
                                                <span className="text-xs text-muted-foreground">{new Date(booking.checkOut).toLocaleDateString('pt-BR')}</span>
                                            </div>
                                        </NeoTableCell>
                                        <NeoTableCell>
                                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-secondary/40 text-xs font-semibold text-foreground border border-border/50">
                                                {booking.roomType?.name}
                                            </span>
                                        </NeoTableCell>
                                        <NeoTableCell className="font-bold text-sm tracking-wide">
                                            ${booking.total?.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </NeoTableCell>
                                        <NeoTableCell>
                                            <span className={
                                                `inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm
                                                ${booking.status === 'CONFIRMED' ? 'text-blue-500 bg-blue-500/10 border-blue-500/20' : ''}
                                                ${booking.status === 'CHECKED_IN' ? 'text-green-500 bg-green-500/10 border-green-500/20' : ''}
                                                ${booking.status === 'CANCELLED' ? 'text-red-500 bg-red-500/10 border-red-500/20' : ''}
                                                `
                                            }>
                                                <span className={
                                                    `w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse
                                                    ${booking.status === 'CONFIRMED' ? 'bg-blue-500' : ''}
                                                    ${booking.status === 'CHECKED_IN' ? 'bg-green-500' : ''}
                                                    ${booking.status === 'CANCELLED' ? 'bg-red-500' : ''}
                                                    `
                                                }></span>
                                                {booking.status}
                                            </span>
                                        </NeoTableCell>
                                        <NeoTableCell className="text-right">
                                            <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all">
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
    )
}
