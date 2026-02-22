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
import { Handshake, PlusCircle, Pencil, Download, Trash2, Check, X, Building2, Globe, Plane, Briefcase } from "lucide-react"

const PARTNER_TYPES = [
    { value: "ALL", label: "Todos", icon: Handshake },
    { value: "AGENCY", label: "Agência", icon: Plane },
    { value: "COMPANY", label: "Empresa", icon: Building2 },
    { value: "OTA", label: "OTA", icon: Globe },
    { value: "CORPORATE", label: "Corporativo", icon: Briefcase },
] as const

type PartnerType = "AGENCY" | "COMPANY" | "OTA" | "CORPORATE"
type Partner = {
    id: string; type: PartnerType; name: string; code: string
    email: string | null; phone: string | null; country: string | null
    commission: number | null; contractRef: string | null; active: boolean
}

const EMPTY_FORM = { type: "AGENCY" as PartnerType, name: "", code: "", email: "", phone: "", country: "", commission: "", contractRef: "" }

const TYPE_COLORS: Record<PartnerType, string> = {
    AGENCY: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    COMPANY: "bg-violet-500/10 text-violet-500 border-violet-500/20",
    OTA: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    CORPORATE: "bg-teal-500/10 text-teal-500 border-teal-500/20",
}

export default function PartnersPage() {
    const [partners, setPartners] = useState<Partner[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<"ALL" | PartnerType>("ALL")
    const [sheetOpen, setSheetOpen] = useState(false)
    const [form, setForm] = useState({ ...EMPTY_FORM })
    const [editing, setEditing] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const hdr = { "x-hotel-id": "HOTEL_001" }
    const load = () => {
        setLoading(true)
        fetch("/api/v1/admin/partners?propertyId=HOTEL_001", { headers: hdr })
            .then(r => r.json())
            .then(d => { setPartners(d.partners || []); setLoading(false) })
            .catch(() => setLoading(false))
    }

    useEffect(() => { load() }, [])

    const openCreate = () => { setEditing(null); setForm({ ...EMPTY_FORM }); setError(null); setSheetOpen(true) }
    const openEdit = (p: Partner) => {
        setEditing(p.id)
        setForm({ type: p.type, name: p.name, code: p.code, email: p.email ?? "", phone: p.phone ?? "", country: p.country ?? "", commission: p.commission?.toString() ?? "", contractRef: p.contractRef ?? "" })
        setError(null); setSheetOpen(true)
    }

    const handleSave = async () => {
        setSaving(true); setError(null)
        try {
            const body = { ...form, commission: form.commission ? Number(form.commission) : null }
            const method = editing ? "PUT" : "POST"
            const url = editing ? `/api/v1/admin/partners/${editing}` : "/api/v1/admin/partners"
            const res = await fetch(url, { method, headers: { "Content-Type": "application/json", ...hdr }, body: JSON.stringify(body) })
            if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
            setSheetOpen(false); load()
        } catch (e: any) { setError(e.message) }
        finally { setSaving(false) }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Inativar este parceiro?")) return
        await fetch(`/api/v1/admin/partners/${id}`, { method: "DELETE", headers: hdr })
        load()
    }

    const filtered = activeTab === "ALL" ? partners : partners.filter(p => p.type === activeTab)
    const TypeIcon = PARTNER_TYPES.find(t => t.value === (editing ? form.type : "AGENCY"))?.icon ?? Handshake

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/40">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight font-heading text-foreground">Parceiros</h1>
                    <p className="text-muted-foreground font-medium tracking-wide">Agências de viagem, empresas, OTAs e contas corporativas.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="inline-flex h-10 items-center justify-center rounded-lg border border-border/50 bg-secondary/30 px-4 py-2 text-sm font-semibold text-foreground transition-all hover:bg-secondary">
                        <Download className="mr-2 h-4 w-4 text-muted-foreground" />Exportar
                    </button>
                    <NeoSheet open={sheetOpen} onOpenChange={setSheetOpen}>
                        <NeoSheetTrigger asChild>
                            <button onClick={openCreate} className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:-translate-y-0.5">
                                <PlusCircle className="mr-2 h-4 w-4" />Novo Parceiro
                            </button>
                        </NeoSheetTrigger>
                        <NeoSheetContent className="w-[420px] sm:w-[580px]">
                            <NeoSheetHeader>
                                <NeoSheetTitle>{editing ? "Editar Parceiro" : "Novo Parceiro"}</NeoSheetTitle>
                                <NeoSheetDescription>Cadastre uma agência, empresa, OTA ou conta corporativa.</NeoSheetDescription>
                            </NeoSheetHeader>
                            <div className="py-6 space-y-4">
                                {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}

                                {/* Tipo */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipo *</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {PARTNER_TYPES.filter(t => t.value !== "ALL").map(t => (
                                            <button key={t.value} type="button"
                                                onClick={() => setForm(f => ({ ...f, type: t.value as PartnerType }))}
                                                className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-semibold transition-all ${form.type === t.value ? "border-primary bg-primary/10 text-primary" : "border-border/50 bg-secondary/30 text-muted-foreground hover:bg-secondary"}`}>
                                                <t.icon className="h-4 w-4" />{t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome *</label>
                                        <NeoInput value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome do parceiro" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Código *</label>
                                        <NeoInput value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="ex: EXPEDIA, IBM_BR" disabled={!!editing} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">E-mail</label>
                                        <NeoInput type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contato@empresa.com" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Telefone</label>
                                        <NeoInput value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+55 11 9..." />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">País</label>
                                        <NeoInput value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="BR, US, PT..." />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Comissão (%)</label>
                                        <NeoInput type="number" step="0.01" min="0" max="100" value={form.commission} onChange={e => setForm(f => ({ ...f, commission: e.target.value }))} placeholder="ex: 15.00" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Referência de Contrato</label>
                                    <NeoInput value={form.contractRef} onChange={e => setForm(f => ({ ...f, contractRef: e.target.value }))} placeholder="Número ou código do contrato" />
                                </div>
                                <div className="pt-4 flex gap-3">
                                    <button onClick={handleSave} disabled={saving} className="inline-flex flex-1 h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 disabled:opacity-50">
                                        <Check className="mr-2 h-4 w-4" />{saving ? "Salvando..." : "Salvar Parceiro"}
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

            {/* Tabs */}
            <div className="flex gap-2 flex-wrap">
                {PARTNER_TYPES.map(t => {
                    const count = t.value === "ALL" ? partners.length : partners.filter(p => p.type === t.value).length
                    return (
                        <button key={t.value} onClick={() => setActiveTab(t.value)}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${activeTab === t.value ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20" : "border-border/50 bg-secondary/30 text-muted-foreground hover:bg-secondary"}`}>
                            <t.icon className="h-4 w-4" />{t.label}
                            <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${activeTab === t.value ? "bg-white/20" : "bg-secondary/80"}`}>{count}</span>
                        </button>
                    )
                })}
            </div>

            {/* Table */}
            <NeoCard className="border-t-4 border-t-primary shadow-sm" glass>
                <NeoCardContent className="p-0">
                    <NeoTableContainer>
                        <NeoTable>
                            <NeoTableHeader>
                                <NeoTableRow className="bg-secondary/20">
                                    <NeoTableHead className="font-bold tracking-wider text-xs uppercase">Tipo</NeoTableHead>
                                    <NeoTableHead className="font-bold tracking-wider text-xs uppercase">Código</NeoTableHead>
                                    <NeoTableHead className="font-bold tracking-wider text-xs uppercase">Nome</NeoTableHead>
                                    <NeoTableHead className="font-bold tracking-wider text-xs uppercase">País</NeoTableHead>
                                    <NeoTableHead className="font-bold tracking-wider text-xs uppercase">Comissão</NeoTableHead>
                                    <NeoTableHead className="font-bold tracking-wider text-xs uppercase">Contato</NeoTableHead>
                                    <NeoTableHead className="text-right font-bold tracking-wider text-xs uppercase">Ações</NeoTableHead>
                                </NeoTableRow>
                            </NeoTableHeader>
                            <tbody>
                                {loading && <NeoTableLoading rows={5} cols={7} />}
                                {!loading && filtered.length === 0 && (
                                    <NeoTableEmpty
                                        colSpan={7}
                                        icon={<Handshake className="h-10 w-10" />}
                                        title="Nenhum parceiro encontrado"
                                        message="Cadastre agências, empresas, OTAs ou contas corporativas."
                                    />
                                )}
                                {!loading && filtered.map(p => {
                                    const typeLabel = PARTNER_TYPES.find(t => t.value === p.type)
                                    return (
                                        <NeoTableRow key={p.id}>
                                            <NeoTableCell>
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${TYPE_COLORS[p.type]}`}>
                                                    {typeLabel && <typeLabel.icon className="h-3 w-3" />}{typeLabel?.label}
                                                </span>
                                            </NeoTableCell>
                                            <NeoTableCell><span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{p.code}</span></NeoTableCell>
                                            <NeoTableCell className="font-semibold">{p.name}</NeoTableCell>
                                            <NeoTableCell className="text-muted-foreground">{p.country || "—"}</NeoTableCell>
                                            <NeoTableCell>{p.commission != null ? <span className="text-green-500 font-semibold">{Number(p.commission).toFixed(1)}%</span> : "—"}</NeoTableCell>
                                            <NeoTableCell className="text-xs text-muted-foreground">{p.email || "—"}</NeoTableCell>
                                            <NeoTableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => openEdit(p)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border/50 bg-secondary/30 text-xs font-semibold transition-all hover:bg-secondary hover:border-primary/40">
                                                        <Pencil className="h-3 w-3" />Editar
                                                    </button>
                                                    <button onClick={() => handleDelete(p.id)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-destructive/20 bg-destructive/5 text-xs font-semibold text-destructive transition-all hover:bg-destructive/10">
                                                        <Trash2 className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            </NeoTableCell>
                                        </NeoTableRow>
                                    )
                                })}
                            </tbody>
                        </NeoTable>
                    </NeoTableContainer>
                </NeoCardContent>
            </NeoCard>
        </div>
    )
}
