"use client"

import { useState } from "react"
import { AriGridView } from "./components/AriGridView"
import { EventLogViewer } from "./components/EventLogViewer"
import { Calendar, History, Activity, CalendarRange, ShieldAlert, Ban } from "lucide-react"
import { NeoCard, NeoCardContent } from "@/components/neo/neo-card"

export default function AriManagementPage() {
    const [showEventLog, setShowEventLog] = useState(false)
    const [matrixKey, setMatrixKey] = useState(0)

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Premium Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/40">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight font-heading text-foreground">
                        Gestão ARI (Disponibilidade, Tarifas e Inventário)
                    </h1>
                    <p className="text-muted-foreground font-medium tracking-wide">
                        Controle centralizado de disponibilidade e regras de precificação.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        className="inline-flex h-10 items-center justify-center rounded-lg border border-border/50 bg-secondary/30 px-4 py-2 text-sm font-semibold text-foreground transition-all hover:bg-secondary hover:text-foreground shadow-sm"
                        onClick={() => setShowEventLog(!showEventLog)}
                    >
                        {showEventLog ? <CalendarRange className="w-4 h-4 mr-2 text-muted-foreground" /> : <History className="w-4 h-4 mr-2 text-muted-foreground" />}
                        {showEventLog ? 'Ver Matriz ARI' : 'Ver Logs de Auditoria'}
                    </button>
                </div>
            </div>

            {/* Dynamic Viewport */}
            {!showEventLog ? (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                            <span className="text-xs font-semibold tracking-wide text-muted-foreground">Matriz Operacional Ativa</span>
                        </div>
                        <div className="flex items-center gap-5 bg-secondary/30 px-3 py-1.5 rounded-lg border border-border/40">
                            <span className="text-xs font-semibold text-foreground mr-1">Legenda:</span>
                            {[
                                {
                                    icon: <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />,
                                    label: "Ativo",
                                    desc: "Quarto disponível e sem restrições"
                                },
                                {
                                    icon: <ShieldAlert className="w-3 h-3 text-amber-500" />,
                                    label: "Restr.",
                                    desc: "Restrição ativa (ex: Min. Noites ou Fechado para Chegada)"
                                },
                                {
                                    icon: <Ban className="w-3 h-3 text-rose-500" />,
                                    label: "Fechado",
                                    desc: "Venda bloqueada para este dia"
                                },
                            ].map(({ icon, label, desc }, i) => (
                                <div
                                    key={i}
                                    className="relative group/legend flex items-center gap-1.5 cursor-help"
                                    title={`${label}: ${desc}`}
                                >
                                    {icon}
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{label}</span>

                                    {/* Visual Tooltip (Premium Design) */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/legend:flex flex-col items-center z-50 pointer-events-none">
                                        <div className="bg-popover border border-border/60 shadow-xl rounded-lg px-3 py-2 min-w-[200px] text-center">
                                            <p className="text-xs font-bold text-foreground whitespace-nowrap">{label}</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug font-medium">{desc}</p>
                                        </div>
                                        <div className="w-2.5 h-2.5 bg-popover border-b border-r border-border/60 rotate-45 -mt-1.5 shadow" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <AriGridView key={matrixKey} />
                </div>
            ) : (
                <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-700">
                    <div className="flex items-center gap-3 px-2">
                        <Activity className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-bold tracking-tight text-foreground">Logs de Alteração (Audit Trail)</h2>
                    </div>
                    <NeoCard className="shadow-sm border-t-4 border-t-primary" glass>
                        <NeoCardContent className="p-6">
                            <EventLogViewer />
                        </NeoCardContent>
                    </NeoCard>
                </div>
            )}
        </div>
    )
}
