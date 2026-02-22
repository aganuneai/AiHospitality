"use client"

import { useState } from "react"
import { NeoCard, NeoCardHeader, NeoCardTitle, NeoCardContent } from "@/components/neo/neo-card"
import { Search, FileText, TrendingUp, DollarSign, ArrowRight, Activity } from "lucide-react"
import { NeoButton } from "@/components/neo/neo-button"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface RevenueAuditViewProps {
    data: {
        categories: Record<string, number>
        items: any[]
        summary: {
            totalRevenue: number
            folioCount: number
            transactionCount: number
        }
    }
    isLoading?: boolean
}

export function RevenueAuditView({ data, isLoading }: RevenueAuditViewProps) {
    const [search, setSearch] = useState("")

    const filteredItems = data.items.filter(item =>
        item.pnr.toLowerCase().includes(search.toLowerCase()) ||
        item.guestName.toLowerCase().includes(search.toLowerCase())
    )

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-32 bg-secondary/30 rounded-2xl border border-border/40" />
                <div className="h-96 bg-secondary/30 rounded-2xl border border-border/40" />
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Category Intelligence */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <NeoCard className="md:col-span-2 shadow-sm border border-border/50 bg-background/50 backdrop-blur-xl">
                    <NeoCardHeader className="pb-3 flex flex-row items-center justify-between border-b border-border/40 bg-secondary/10">
                        <NeoCardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Activity className="w-4 h-4 text-primary" />
                            Composição Comercial (Mix)
                        </NeoCardTitle>
                        <div className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-md font-bold tracking-widest shadow-sm border border-primary/20">
                            TEMPO REAL
                        </div>
                    </NeoCardHeader>
                    <NeoCardContent className="pt-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {Object.entries(data.categories).map(([code, amount]) => (
                                <div key={code} className="p-4 bg-secondary/20 border border-border/40 rounded-xl hover:border-primary/40 hover:bg-secondary/40 transition-all group shadow-sm">
                                    <div className="text-xs font-semibold text-muted-foreground group-hover:text-primary transition-colors">{code}</div>
                                    <div className="text-lg font-bold mt-1 text-foreground">
                                        R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </div>
                                    <div className="h-1.5 bg-secondary/50 rounded-full mt-3 overflow-hidden shadow-inner">
                                        <div
                                            className="h-full bg-primary transition-all duration-1000 shadow-[0_0_12px_rgba(var(--primary),0.5)]"
                                            style={{ width: `${(amount / data.summary.totalRevenue) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </NeoCardContent>
                </NeoCard>

                <NeoCard className="shadow-sm border border-border/50 bg-background/50 backdrop-blur-xl">
                    <NeoCardHeader className="pb-3 border-b border-border/40 bg-secondary/10">
                        <NeoCardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                            Resumo de Performance
                        </NeoCardTitle>
                    </NeoCardHeader>
                    <NeoCardContent className="pt-6 space-y-4">
                        <div className="flex justify-between items-end">
                            <div className="text-xs text-muted-foreground font-semibold tracking-wide">Receita Total</div>
                            <div className="text-2xl font-bold font-heading text-emerald-500 tracking-tight drop-shadow-sm">
                                R$ {data.summary.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/40">
                            <div>
                                <div className="text-xs text-muted-foreground font-semibold">Fólios Faturados</div>
                                <div className="text-xl font-bold font-heading text-foreground mt-1">{data.summary.folioCount}</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground font-semibold">Itens Processados</div>
                                <div className="text-xl font-bold font-heading text-foreground mt-1">{data.summary.transactionCount}</div>
                            </div>
                        </div>
                    </NeoCardContent>
                </NeoCard>
            </div>

            {/* Audit Log Table */}
            <NeoCard className="shadow-sm border border-border/50 bg-background/50 backdrop-blur-xl overflow-hidden">
                <NeoCardHeader className="pb-4 border-b border-border/40 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-secondary/10">
                    <NeoCardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        Log de Auditoria de Transações
                    </NeoCardTitle>

                    <div className="relative group w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar por PNR ou Nome..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-background border border-border/50 rounded-lg py-2 pl-9 pr-4 text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm transition-all text-foreground"
                        />
                    </div>
                </NeoCardHeader>
                <NeoCardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-secondary/20">
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/30">Fólio / PNR</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/30">Hóspede</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/30 text-center">Período de Estadia</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/30 text-right">Valor Total</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/30 text-center">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/30"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20">
                                {filteredItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-secondary/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-sm text-primary tracking-tight">{item.pnr}</div>
                                            <div className="text-[10px] text-muted-foreground mt-0.5">ID: {item.id.slice(0, 8)}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-sm text-foreground">{item.guestName}</div>
                                            <div className="text-xs text-muted-foreground mt-0.5 font-medium">
                                                {item.items.length} {item.items.length === 1 ? 'item' : 'itens'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="inline-flex items-center gap-2 bg-background border border-border/40 px-2 py-1 rounded-md text-[11px] font-semibold text-foreground shadow-sm">
                                                {format(new Date(item.checkIn), 'dd MMM', { locale: ptBR })}
                                                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                                {format(new Date(item.checkOut), 'dd MMM', { locale: ptBR })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="font-bold text-sm text-foreground">
                                                R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md border shadow-sm ${item.status === 'CLOSED'
                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                                }`}>
                                                {item.status === 'CLOSED' ? 'FECHADO' : item.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <NeoButton variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-secondary/50 rounded-full">
                                                <ArrowRight className="w-4 h-4 text-muted-foreground transition-all group-hover:text-primary group-hover:translate-x-0.5" />
                                            </NeoButton>
                                        </td>
                                    </tr>
                                ))}
                                {filteredItems.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-16 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center gap-3">
                                                <Activity className="w-10 h-10 opacity-20" />
                                                <div className="text-sm font-semibold tracking-wide">Nenhuma transação encontrada</div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </NeoCardContent>
            </NeoCard>
        </div>
    )
}
