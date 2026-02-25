"use client"

import { NeoCard, NeoCardHeader, NeoCardTitle, NeoCardContent } from "@/components/neo/neo-card"
import { useNeoFetch } from "@/hooks/use-neo-api"
import { DashboardKPIs } from "@/lib/services/analytics-service"
import { TrendingUp, TrendingDown, Minus, Loader2, ArrowRight, CalendarCheck, CalendarRange, Wallet, Users } from "lucide-react"
import Link from "next/link"

export default function AdminDashboard() {
    const { data: kpis, loading, error } = useNeoFetch<DashboardKPIs>('/api/v1/admin/analytics/dashboard')

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground font-medium animate-pulse">Carregando métricas operacionais...</p>
                </div>
            </div>
        )
    }

    // fallback if no data
    const stats = kpis || {
        revenue: { value: 0, change: 0 },
        occupancy: { value: 0, change: 0 },
        adr: { value: 0, change: 0 },
        revpar: { value: 0, change: 0 },
        activeUpsells: 0,
        pendingTasks: 0
    }

    const renderTrend = (value: number) => {
        if (value > 0) return <span className="text-emerald-500 font-medium flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded-md"><TrendingUp className="w-3 h-3" /> +{value.toFixed(1)}%</span>
        if (value < 0) return <span className="text-rose-500 font-medium flex items-center gap-1 bg-rose-500/10 px-1.5 py-0.5 rounded-md"><TrendingDown className="w-3 h-3" /> {value.toFixed(1)}%</span>
        return <span className="text-muted-foreground font-medium flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded-md"><Minus className="w-3 h-3" /> 0%</span>
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Premium Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/40">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight font-heading text-foreground">
                        Bom dia, Ana.
                    </h1>
                    <p className="text-muted-foreground font-medium tracking-wide">
                        Aqui está o resumo operacional da sua propriedade hoje.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/admin/bookings/new" className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:-translate-y-0.5">
                        <CalendarCheck className="mr-2 h-4 w-4" />
                        Nova Reserva
                    </Link>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                <NeoCard className="relative overflow-hidden group hover:border-primary/40 transition-colors" glass>
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <NeoCardHeader className="pb-2">
                        <NeoCardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-primary" /> Receita Mensal
                        </NeoCardTitle>
                    </NeoCardHeader>
                    <NeoCardContent>
                        <div className="text-3xl font-bold font-heading text-foreground">
                            ${stats.revenue.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs pt-3 flex items-center gap-2">
                            {renderTrend(stats.revenue.change)} <span className="text-muted-foreground">vs mês passado</span>
                        </div>
                    </NeoCardContent>
                </NeoCard>

                <NeoCard className="relative overflow-hidden group hover:border-primary/40 transition-colors" glass>
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <NeoCardHeader className="pb-2">
                        <NeoCardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" /> Ocupação Hoje
                        </NeoCardTitle>
                    </NeoCardHeader>
                    <NeoCardContent>
                        <div className="text-3xl font-bold font-heading text-foreground">
                            {stats.occupancy.value.toFixed(1)}%
                        </div>
                        <div className="text-xs pt-3 flex items-center gap-2">
                            {renderTrend(stats.occupancy.change)} <span className="text-muted-foreground">desde ontem</span>
                        </div>
                    </NeoCardContent>
                </NeoCard>

                <NeoCard className="relative overflow-hidden group hover:border-primary/40 transition-colors" glass>
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <NeoCardHeader className="pb-2">
                        <NeoCardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-primary" /> Diária Média (ADR)
                        </NeoCardTitle>
                    </NeoCardHeader>
                    <NeoCardContent>
                        <div className="text-3xl font-bold font-heading text-foreground">
                            ${stats.adr.value.toFixed(2)}
                        </div>
                        <div className="text-xs pt-3 flex items-center gap-2">
                            {renderTrend(stats.adr.change)} <span className="text-muted-foreground">tendência</span>
                        </div>
                    </NeoCardContent>
                </NeoCard>

                <NeoCard className="relative overflow-hidden group hover:border-primary/40 transition-colors" glass>
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <NeoCardHeader className="pb-2">
                        <NeoCardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-primary" /> RevPAR
                        </NeoCardTitle>
                    </NeoCardHeader>
                    <NeoCardContent>
                        <div className="text-3xl font-bold font-heading text-foreground">
                            ${stats.revpar.value.toFixed(2)}
                        </div>
                        <div className="text-xs pt-3 flex items-center gap-2">
                            {renderTrend(stats.revpar.change)} <span className="text-muted-foreground">yield</span>
                        </div>
                    </NeoCardContent>
                </NeoCard>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-7">
                {/* Critical Signals */}
                <NeoCard className="col-span-4 border-t-4 border-t-primary shadow-sm" glass>
                    <NeoCardHeader>
                        <NeoCardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">Métricas em Destaque</NeoCardTitle>
                    </NeoCardHeader>
                    <NeoCardContent className="space-y-4">
                        <div className="flex justify-between items-center p-5 rounded-xl bg-primary/5 border border-primary/10 transition-all hover:bg-primary/10 hover:border-primary/20">
                            <div>
                                <span className="text-sm font-bold text-foreground">Ofertas de Upsell Ativas</span>
                                <p className="text-xs text-muted-foreground mt-1">Hóspedes visualizando upgrades de quarto</p>
                            </div>
                            <span className="font-heading text-3xl text-primary font-bold">{stats.activeUpsells}</span>
                        </div>
                        <div className="flex justify-between items-center p-5 rounded-xl bg-amber-500/5 border border-amber-500/10 transition-all hover:bg-amber-500/10 hover:border-amber-500/20">
                            <div>
                                <span className="text-sm font-bold text-foreground">Chegadas Pendentes</span>
                                <p className="text-xs text-muted-foreground mt-1">Hóspedes aguardando check-in hoje</p>
                            </div>
                            <span className="font-heading text-3xl text-amber-500 font-bold">{stats.pendingTasks}</span>
                        </div>
                    </NeoCardContent>
                </NeoCard>

                {/* Quick Actions */}
                <NeoCard className="col-span-3 shadow-sm" glass>
                    <NeoCardHeader>
                        <NeoCardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">Ações Rápidas</NeoCardTitle>
                    </NeoCardHeader>
                    <NeoCardContent>
                        <div className="grid gap-3">
                            <Link href="/admin/ari" className="p-4 rounded-xl border border-border/40 bg-secondary/20 hover:border-primary/40 hover:bg-primary/5 transition-all flex justify-between items-center group">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center border border-border/50 shadow-sm group-hover:border-primary/30 group-hover:text-primary transition-colors">
                                        <CalendarRange size={16} />
                                    </div>
                                    <span className="text-sm font-semibold text-foreground">Gerenciar Mapa ARI</span>
                                </div>
                                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-1" />
                            </Link>

                            <Link href="/admin/bookings" className="p-4 rounded-xl border border-border/40 bg-secondary/20 hover:border-primary/40 hover:bg-primary/5 transition-all flex justify-between items-center group">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center border border-border/50 shadow-sm group-hover:border-primary/30 group-hover:text-primary transition-colors">
                                        <CalendarCheck size={16} />
                                    </div>
                                    <span className="text-sm font-semibold text-foreground">Consultar Reservas</span>
                                </div>
                                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-1" />
                            </Link>

                            <Link href="/admin/analytics/revenue" className="p-4 rounded-xl border border-border/40 bg-secondary/20 hover:border-primary/40 hover:bg-primary/5 transition-all flex justify-between items-center group">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center border border-border/50 shadow-sm group-hover:border-primary/30 group-hover:text-primary transition-colors">
                                        <Wallet size={16} />
                                    </div>
                                    <span className="text-sm font-semibold text-foreground">Auditoria de Receita</span>
                                </div>
                                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-1" />
                            </Link>
                        </div>
                    </NeoCardContent>
                </NeoCard>
            </div>
        </div>
    )
}

