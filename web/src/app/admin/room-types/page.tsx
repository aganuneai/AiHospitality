"use client"

import { useState, useEffect } from "react"
import { NeoCard, NeoCardContent } from "@/components/neo/neo-card"
import {
    NeoTable, NeoTableContainer, NeoTableHeader,
    NeoTableRow, NeoTableHead, NeoTableCell,
    NeoTableLoading, NeoTableEmpty
} from "@/components/neo/neo-table"
import { NeoDialog, NeoDialogContent, NeoDialogHeader, NeoDialogTitle, NeoDialogDescription, NeoDialogTrigger, NeoDialogBody, NeoDialogActions } from "@/components/neo/neo-dialog"
import { NeoInput } from "@/components/neo/neo-input"
import { Hotel, PlusCircle, Pencil, Bed, Users, Download, Trash2, Check, X } from "lucide-react"

type RoomType = {
    id: string
    code: string
    name: string
    description: string | null
    maxAdults: number
    maxChildren: number
}

const EMPTY: Partial<RoomType> = { code: "", name: "", description: "", maxAdults: 2, maxChildren: 0 }

export default function RoomTypesPage() {
    const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [form, setForm] = useState<Partial<RoomType>>(EMPTY)
    const [editing, setEditing] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchRoomTypes = () => {
        setLoading(true)
        fetch("/api/v1/admin/room-types?propertyId=HOTEL_001")
            .then(res => res.json())
            .then(data => { setRoomTypes(Array.isArray(data) ? data : []); setLoading(false) })
            .catch(() => setLoading(false))
    }

    useEffect(() => { fetchRoomTypes() }, [])

    const openCreate = () => { setEditing(null); setForm(EMPTY); setError(null); setDialogOpen(true) }
    const openEdit = (rt: RoomType) => { setEditing(rt.id); setForm({ ...rt }); setError(null); setDialogOpen(true) }

    const handleSave = async () => {
        setSaving(true); setError(null)
        try {
            const method = editing ? "PUT" : "POST"
            const url = editing ? `/api/v1/admin/room-types/${editing}` : "/api/v1/admin/room-types"
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json", "x-hotel-id": "HOTEL_001" },
                body: JSON.stringify(form)
            })
            if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
            setDialogOpen(false); fetchRoomTypes()
        } catch (e: any) { setError(e.message) }
        finally { setSaving(false) }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Remover este tipo de quarto?")) return
        await fetch(`/api/v1/admin/room-types/${id}`, { method: "DELETE" })
        fetchRoomTypes()
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/40">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight font-heading text-foreground">Tipos de Quarto</h1>
                    <p className="text-muted-foreground font-medium tracking-wide">Categorias de acomodação disponíveis na propriedade.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="inline-flex h-10 items-center justify-center rounded-lg border border-border/50 bg-secondary/30 px-4 py-2 text-sm font-semibold text-foreground transition-all hover:bg-secondary">
                        <Download className="mr-2 h-4 w-4 text-muted-foreground" />Exportar
                    </button>
                    <NeoDialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <NeoDialogTrigger asChild>
                            <button onClick={openCreate} className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:-translate-y-0.5">
                                <PlusCircle className="mr-2 h-4 w-4" />Novo Tipo
                            </button>
                        </NeoDialogTrigger>
                        <NeoDialogContent className="sm:max-w-[500px]">
                            <NeoDialogHeader>
                                <NeoDialogTitle>{editing ? "Editar Tipo de Quarto" : "Novo Tipo de Quarto"}</NeoDialogTitle>
                                <NeoDialogDescription>Defina as capacidades e descrição da categoria.</NeoDialogDescription>
                            </NeoDialogHeader>
                            <NeoDialogBody>
                                <div className="space-y-4">
                                    {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Código *</label>
                                            <NeoInput value={form.code ?? ""} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="ex: STD, DLX, SUITE" disabled={!!editing} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome *</label>
                                            <NeoInput value={form.name ?? ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ex: Quarto Deluxe" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descrição</label>
                                        <NeoInput value={form.description ?? ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrição para o hóspede..." />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Máx. Adultos</label>
                                            <NeoInput type="number" min={1} max={10} value={form.maxAdults ?? 2} onChange={e => setForm(f => ({ ...f, maxAdults: Number(e.target.value) }))} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Máx. Crianças</label>
                                            <NeoInput type="number" min={0} max={10} value={form.maxChildren ?? 0} onChange={e => setForm(f => ({ ...f, maxChildren: Number(e.target.value) }))} />
                                        </div>
                                    </div>
                                </div>
                            </NeoDialogBody>
                            <NeoDialogActions>
                                <button onClick={() => setDialogOpen(false)} className="inline-flex h-10 items-center justify-center rounded-lg border border-border/50 px-6 text-sm font-semibold text-muted-foreground transition-all hover:bg-secondary">
                                    <X className="mr-2 h-4 w-4" />Cancelar
                                </button>
                                <button onClick={handleSave} disabled={saving} className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 disabled:opacity-50">
                                    <Check className="mr-2 h-4 w-4" />{saving ? "Salvando..." : "Salvar"}
                                </button>
                            </NeoDialogActions>
                        </NeoDialogContent>
                    </NeoDialog>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: "Tipos Cadastrados", value: roomTypes.length, icon: Hotel, color: "text-blue-500" },
                    { label: "Capacidade Máx.", value: roomTypes.reduce((a, rt) => Math.max(a, rt.maxAdults), 0), icon: Bed, color: "text-green-500" },
                    { label: "Med. por Tipo", value: roomTypes.length > 0 ? (roomTypes.reduce((a, rt) => a + rt.maxAdults, 0) / roomTypes.length).toFixed(1) : "0", icon: Users, color: "text-violet-500" },
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
                                    <NeoTableHead className="font-bold tracking-wider text-xs uppercase text-center">Adultos</NeoTableHead>
                                    <NeoTableHead className="font-bold tracking-wider text-xs uppercase text-center">Crianças</NeoTableHead>
                                    <NeoTableHead className="text-right font-bold tracking-wider text-xs uppercase">Ações</NeoTableHead>
                                </NeoTableRow>
                            </NeoTableHeader>
                            <tbody>
                                {loading && <NeoTableLoading rows={4} cols={6} />}
                                {!loading && roomTypes.length === 0 && (
                                    <NeoTableEmpty
                                        colSpan={6}
                                        icon={<Hotel className="h-10 w-10" />}
                                        title="Nenhum tipo de quarto cadastrado"
                                        message="Crie o primeiro tipo de quarto clicando em 'Novo Tipo'."
                                    />
                                )}
                                {!loading && roomTypes.map(rt => (
                                    <NeoTableRow key={rt.id}>
                                        <NeoTableCell>
                                            <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{rt.code}</span>
                                        </NeoTableCell>
                                        <NeoTableCell className="font-semibold">{rt.name}</NeoTableCell>
                                        <NeoTableCell className="text-muted-foreground max-w-[200px] truncate">{rt.description || "—"}</NeoTableCell>
                                        <NeoTableCell className="text-center font-medium">{rt.maxAdults}</NeoTableCell>
                                        <NeoTableCell className="text-center font-medium">{rt.maxChildren}</NeoTableCell>
                                        <NeoTableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => openEdit(rt)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border/50 bg-secondary/30 text-xs font-semibold transition-all hover:bg-secondary hover:border-primary/40">
                                                    <Pencil className="h-3 w-3" />Editar
                                                </button>
                                                <button onClick={() => handleDelete(rt.id)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-destructive/20 bg-destructive/5 text-xs font-semibold text-destructive transition-all hover:bg-destructive/10">
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
