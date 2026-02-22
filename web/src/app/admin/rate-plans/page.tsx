"use client"

import { useState, useEffect } from "react"
import { NeoCard, NeoCardContent } from "@/components/neo/neo-card"
import {
    NeoTable, NeoTableContainer, NeoTableHeader,
    NeoTableRow, NeoTableHead, NeoTableCell,
    NeoTableLoading, NeoTableEmpty
} from "@/components/neo/neo-table"
import { NeoSheet, NeoSheetContent, NeoSheetHeader, NeoSheetTitle, NeoSheetDescription, NeoSheetTrigger } from "@/components/neo/neo-sheet"
import { NeoInput } from "@/components/neo/neo-input"
import { BadgeDollarSign, PlusCircle, Pencil, Download, Trash2, Check, X, List, Sparkles } from "lucide-react"

type RatePlan = {
    id: string;
    code: string;
    name: string;
    description: string | null;
    parentRatePlanId?: string | null;
    derivedType?: string | null;
    derivedValue?: string | number | null;
    roundingRule?: string | null;
}
const EMPTY: Partial<RatePlan> = {
    code: "",
    name: "",
    description: "",
    parentRatePlanId: null,
    derivedType: "PERCENTAGE",
    derivedValue: "",
    roundingRule: "NONE"
}

export default function RatePlansPage() {
    const [ratePlans, setRatePlans] = useState<RatePlan[]>([])
    const [loading, setLoading] = useState(true)
    const [sheetOpen, setSheetOpen] = useState(false)
    const [form, setForm] = useState<Partial<RatePlan>>(EMPTY)
    const [editing, setEditing] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const load = () => {
        setLoading(true)
        fetch("/api/v1/admin/rate-plans?propertyId=HOTEL_001", { headers: { "x-hotel-id": "HOTEL_001" } })
            .then(r => r.json())
            .then(d => { setRatePlans(d.ratePlans || []); setLoading(false) })
            .catch(() => setLoading(false))
    }

    useEffect(() => { load() }, [])

    const openCreate = () => { setEditing(null); setForm(EMPTY); setError(null); setSheetOpen(true) }
    const openEdit = (rp: RatePlan) => { setEditing(rp.id); setForm({ ...rp }); setError(null); setSheetOpen(true) }

    const handleSave = async () => {
        setSaving(true); setError(null)
        try {
            const method = editing ? "PUT" : "POST"
            const url = editing ? `/api/v1/admin/rate-plans/${editing}` : "/api/v1/admin/rate-plans"
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json", "x-hotel-id": "HOTEL_001" },
                body: JSON.stringify(form)
            })
            if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
            setSheetOpen(false); load()
        } catch (e: any) { setError(e.message) }
        finally { setSaving(false) }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Remover este rate plan?")) return
        await fetch(`/api/v1/admin/rate-plans/${id}`, { method: "DELETE", headers: { "x-hotel-id": "HOTEL_001" } })
        load()
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/40">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight font-heading text-foreground">Rate Plans</h1>
                    <p className="text-muted-foreground font-medium tracking-wide">Planos tarifários disponíveis na propriedade (BAR, B&B, Pacote, etc.).</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="inline-flex h-10 items-center justify-center rounded-lg border border-border/50 bg-secondary/30 px-4 py-2 text-sm font-semibold text-foreground transition-all hover:bg-secondary">
                        <Download className="mr-2 h-4 w-4 text-muted-foreground" />Exportar
                    </button>
                    <NeoSheet open={sheetOpen} onOpenChange={setSheetOpen}>
                        <NeoSheetTrigger asChild>
                            <button onClick={openCreate} className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:-translate-y-0.5">
                                <PlusCircle className="mr-2 h-4 w-4" />Novo Rate Plan
                            </button>
                        </NeoSheetTrigger>
                        <NeoSheetContent className="w-[420px] sm:w-[560px]">
                            <NeoSheetHeader>
                                <NeoSheetTitle>{editing ? "Editar Rate Plan" : "Novo Rate Plan"}</NeoSheetTitle>
                                <NeoSheetDescription>O código será usado como identificador no sistema de distribuição.</NeoSheetDescription>
                            </NeoSheetHeader>
                            <div className="py-6 space-y-4">
                                {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Código *</label>
                                        <NeoInput value={form.code ?? ""} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="ex: BAR, BB, CORP" disabled={!!editing} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome *</label>
                                        <NeoInput value={form.name ?? ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ex: Best Available Rate" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descrição</label>
                                    <NeoInput value={form.description ?? ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrição do plano tarifário..." />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tarifa Pai (Derivação)</label>
                                        <select
                                            value={form.parentRatePlanId ?? ""}
                                            onChange={e => setForm(f => ({ ...f, parentRatePlanId: e.target.value || null }))}
                                            className="h-10 w-full bg-background border border-border/50 rounded-lg text-sm px-3 focus:ring-1 focus:ring-primary outline-none"
                                        >
                                            <option value="">Nenhuma (Independente)</option>
                                            {ratePlans.filter(rp => rp.id !== editing).map(rp => (
                                                <option key={rp.id} value={rp.id}>{rp.name} ({rp.code})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Arredondamento</label>
                                        <select
                                            value={form.roundingRule ?? "NONE"}
                                            onChange={e => setForm(f => ({ ...f, roundingRule: e.target.value }))}
                                            className="h-10 w-full bg-background border border-border/50 rounded-lg text-sm px-3 focus:ring-1 focus:ring-primary outline-none"
                                        >
                                            <option value="NONE">Sem Arredondamento</option>
                                            <option value="NEAREST_WHOLE">Inteiro mais Próximo</option>
                                            <option value="ENDING_99">Final .99</option>
                                            <option value="ENDING_90">Final .90</option>
                                            <option value="MULTIPLE_5">Múltiplo de 5</option>
                                            <option value="MULTIPLE_10">Múltiplo de 10</option>
                                        </select>
                                    </div>
                                </div>

                                {form.parentRatePlanId && (
                                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 space-y-4 animate-in slide-in-from-top-2 duration-300">
                                        <p className="text-xs font-bold text-primary flex items-center gap-2">
                                            <Sparkles className="w-3 h-3" /> CONFIGURAÇÃO DE DERIVAÇÃO
                                        </p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipo de Cálculo</label>
                                                <select
                                                    value={form.derivedType ?? "PERCENTAGE"}
                                                    onChange={e => setForm(f => ({ ...f, derivedType: e.target.value }))}
                                                    className="h-10 w-full bg-background border border-border/50 rounded-lg text-sm px-3 focus:ring-1 focus:ring-primary outline-none"
                                                >
                                                    <option value="PERCENTAGE">Porcentagem (%)</option>
                                                    <option value="FIXED_AMOUNT">Valor Fixo ($)</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ajuste (ex: -10 ou 15)</label>
                                                <NeoInput
                                                    type="number"
                                                    value={form.derivedValue ?? ""}
                                                    onChange={e => setForm(f => ({ ...f, derivedValue: e.target.value }))}
                                                    placeholder="Valor do ajuste..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 flex gap-3">
                                    <button onClick={handleSave} disabled={saving} className="inline-flex flex-1 h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 disabled:opacity-50">
                                        <Check className="mr-2 h-4 w-4" />{saving ? "Salvando..." : "Salvar"}
                                    </button>
                                    <button onClick={() => setSheetOpen(false)} className="inline-flex h-10 items-center justify-center rounded-lg border border-border/50 px-4 text-sm font-semibold text-muted-foreground transition-all hover:bg-secondary">
                                        <X className="mr-2 h-4 w-4" />Cancelar
                                    </button>
                                </div>
                            </div>
                        </NeoSheetContent>
                    </NeoSheet>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                    { label: "Rate Plans Ativos", value: ratePlans.length, icon: BadgeDollarSign, color: "text-blue-500" },
                    { label: "Tipos de Plano", value: ratePlans.length, icon: List, color: "text-green-500" },
                ].map(stat => (
                    <NeoCard key={stat.label} glass className="p-4">
                        <NeoCardContent className="p-0">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg bg-secondary/50 ${stat.color}`}>
                                    <stat.icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{stat.label}</p>
                                    <p className="text-2xl font-bold font-heading">{loading ? "—" : stat.value}</p>
                                </div>
                            </div>
                        </NeoCardContent>
                    </NeoCard>
                ))}
            </div>

            {/* Table */}
            <NeoCard className="border-t-4 border-t-primary shadow-sm" glass>
                <NeoCardContent className="p-0">
                    <NeoTableContainer>
                        <NeoTable>
                            <NeoTableHeader>
                                <NeoTableRow className="bg-secondary/20">
                                    <NeoTableHead className="font-bold tracking-wider text-xs uppercase">Código</NeoTableHead>
                                    <NeoTableHead className="font-bold tracking-wider text-xs uppercase">Nome</NeoTableHead>
                                    <NeoTableHead className="font-bold tracking-wider text-xs uppercase">Descrição</NeoTableHead>
                                    <NeoTableHead className="text-right font-bold tracking-wider text-xs uppercase">Ações</NeoTableHead>
                                </NeoTableRow>
                            </NeoTableHeader>
                            <tbody>
                                {loading && <NeoTableLoading rows={4} cols={4} />}
                                {!loading && ratePlans.length === 0 && (
                                    <NeoTableEmpty
                                        colSpan={4}
                                        icon={<BadgeDollarSign className="h-10 w-10" />}
                                        title="Nenhum rate plan cadastrado"
                                        message="Crie o primeiro rate plan como BAR, B&B ou Corporativo."
                                    />
                                )}
                                {!loading && ratePlans.map(rp => (
                                    <NeoTableRow key={rp.id}>
                                        <NeoTableCell>
                                            <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{rp.code}</span>
                                        </NeoTableCell>
                                        <NeoTableCell className="font-semibold">
                                            <div className="flex flex-col">
                                                <span>{rp.name}</span>
                                                {rp.parentRatePlanId && (
                                                    <span className="text-[10px] text-primary font-bold flex items-center gap-1 mt-0.5">
                                                        <Sparkles className="w-2.5 h-2.5" />
                                                        Derivado de: {ratePlans.find(p => p.id === rp.parentRatePlanId)?.code || "Unknown"}
                                                        ({rp.derivedType === 'PERCENTAGE' ? (Number(rp.derivedValue) >= 0 ? '+' : '') + rp.derivedValue + '%' : (Number(rp.derivedValue) >= 0 ? '+' : '') + rp.derivedValue})
                                                    </span>
                                                )}
                                            </div>
                                        </NeoTableCell>
                                        <NeoTableCell className="text-muted-foreground text-xs max-w-[240px] truncate">{rp.description || "—"}</NeoTableCell>
                                        <NeoTableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => openEdit(rp)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border/50 bg-secondary/30 text-xs font-semibold transition-all hover:bg-secondary hover:border-primary/40">
                                                    <Pencil className="h-3 w-3" />Editar
                                                </button>
                                                <button onClick={() => handleDelete(rp.id)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-destructive/20 bg-destructive/5 text-xs font-semibold text-destructive transition-all hover:bg-destructive/10">
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
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
