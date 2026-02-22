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
import { DoorClosed, PlusCircle, Pencil, Download, Trash2, Check, X, Tag } from "lucide-react"

const STATUS_MAP: Record<string, { label: string; color: string; dot: string }> = {
    CLEAN: { label: "Limpo", color: "bg-green-500/10 text-green-500 border-green-500/20", dot: "bg-green-500" },
    DIRTY: { label: "Sujo", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", dot: "bg-yellow-500" },
    INSPECTION: { label: "Vistoria", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", dot: "bg-blue-500" },
    OOO: { label: "Fora de Serviço", color: "bg-red-500/10 text-red-500 border-red-500/20", dot: "bg-red-500" },
}

type RoomType = { id: string; name: string; code: string }
type Room = { id: string; name: string; status: string; tags: string[]; roomType: RoomType }

const EMPTY_FORM = { name: "", roomTypeId: "", status: "CLEAN", tags: "" }

export default function RoomsPage() {
    const [rooms, setRooms] = useState<Room[]>([])
    const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
    const [loading, setLoading] = useState(true)
    const [sheetOpen, setSheetOpen] = useState(false)
    const [form, setForm] = useState(EMPTY_FORM)
    const [editing, setEditing] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetch_ = (url: string, opts?: RequestInit) => fetch(url, { headers: { "x-hotel-id": "HOTEL_001" }, ...opts })

    const load = () => {
        setLoading(true)
        Promise.all([
            fetch_("/api/v1/admin/rooms?propertyId=HOTEL_001").then(r => r.json()),
            fetch_("/api/v1/admin/room-types?propertyId=HOTEL_001").then(r => r.json()),
        ]).then(([rd, rt]) => {
            setRooms(rd.rooms || [])
            setRoomTypes(Array.isArray(rt) ? rt : [])
            setLoading(false)
        }).catch(() => setLoading(false))
    }

    useEffect(() => { load() }, [])

    const openCreate = () => {
        setEditing(null)
        setForm({ ...EMPTY_FORM, roomTypeId: roomTypes[0]?.id ?? "" })
        setError(null); setSheetOpen(true)
    }

    const openEdit = (r: Room) => {
        setEditing(r.id)
        setForm({ name: r.name, roomTypeId: r.roomType.id, status: r.status, tags: r.tags.join(", ") })
        setError(null); setSheetOpen(true)
    }

    const handleSave = async () => {
        setSaving(true); setError(null)
        try {
            const body = { ...form, tags: form.tags.split(",").map(t => t.trim()).filter(Boolean) }
            const method = editing ? "PUT" : "POST"
            const url = editing ? `/api/v1/admin/rooms/${editing}` : "/api/v1/admin/rooms"
            const res = await fetch_(url, { method, headers: { "Content-Type": "application/json", "x-hotel-id": "HOTEL_001" }, body: JSON.stringify(body) })
            if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
            setSheetOpen(false); load()
        } catch (e: any) { setError(e.message) }
        finally { setSaving(false) }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Remover este quarto?")) return
        await fetch_(`/api/v1/admin/rooms/${id}`, { method: "DELETE" })
        load()
    }

    const statusCounts = rooms.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc }, {} as Record<string, number>)

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/40">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight font-heading text-foreground">Quartos Físicos</h1>
                    <p className="text-muted-foreground font-medium tracking-wide">Gestão de unidades de hospedagem e seu status de housekeeping.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="inline-flex h-10 items-center justify-center rounded-lg border border-border/50 bg-secondary/30 px-4 py-2 text-sm font-semibold text-foreground transition-all hover:bg-secondary">
                        <Download className="mr-2 h-4 w-4 text-muted-foreground" />Exportar
                    </button>
                    <NeoSheet open={sheetOpen} onOpenChange={setSheetOpen}>
                        <NeoSheetTrigger asChild>
                            <button onClick={openCreate} className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:-translate-y-0.5">
                                <PlusCircle className="mr-2 h-4 w-4" />Novo Quarto
                            </button>
                        </NeoSheetTrigger>
                        <NeoSheetContent className="w-[420px] sm:w-[560px]">
                            <NeoSheetHeader>
                                <NeoSheetTitle>{editing ? "Editar Quarto" : "Novo Quarto"}</NeoSheetTitle>
                                <NeoSheetDescription>Cadastre ou edite uma unidade de hospedagem.</NeoSheetDescription>
                            </NeoSheetHeader>
                            <div className="py-6 space-y-4">
                                {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Número / Nome *</label>
                                        <NeoInput value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ex: 101, Villa A" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipo de Quarto *</label>
                                        <select value={form.roomTypeId} onChange={e => setForm(f => ({ ...f, roomTypeId: e.target.value }))}
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                                            <option value="">Selecione...</option>
                                            {roomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name} ({rt.code})</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</label>
                                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                                        {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tags (separadas por vírgula)</label>
                                    <NeoInput value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="ex: Vista Mar, Andar Alto, Banheira" />
                                </div>
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

            {/* Status summary pills */}
            <div className="flex flex-wrap gap-3">
                {Object.entries(STATUS_MAP).map(([k, v]) => (
                    <div key={k} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${v.color}`}>
                        <span className={`h-2 w-2 rounded-full ${v.dot}`} />
                        {v.label}: <span className="font-bold">{loading ? "—" : (statusCounts[k] ?? 0)}</span>
                    </div>
                ))}
            </div>

            {/* Table */}
            <NeoCard className="border-t-4 border-t-primary shadow-sm" glass>
                <NeoCardContent className="p-0">
                    <NeoTableContainer>
                        <NeoTable>
                            <NeoTableHeader>
                                <NeoTableRow className="bg-secondary/20">
                                    <NeoTableHead className="font-bold tracking-wider text-xs uppercase">Quarto</NeoTableHead>
                                    <NeoTableHead className="font-bold tracking-wider text-xs uppercase">Tipo</NeoTableHead>
                                    <NeoTableHead className="font-bold tracking-wider text-xs uppercase">Status</NeoTableHead>
                                    <NeoTableHead className="font-bold tracking-wider text-xs uppercase">Tags</NeoTableHead>
                                    <NeoTableHead className="text-right font-bold tracking-wider text-xs uppercase">Ações</NeoTableHead>
                                </NeoTableRow>
                            </NeoTableHeader>
                            <tbody>
                                {loading && <NeoTableLoading rows={5} cols={5} />}
                                {!loading && rooms.length === 0 && (
                                    <NeoTableEmpty
                                        colSpan={5}
                                        icon={<DoorClosed className="h-10 w-10" />}
                                        title="Nenhum quarto cadastrado"
                                        message="Crie o primeiro quarto clicando em 'Novo Quarto'."
                                    />
                                )}
                                {!loading && rooms.map(r => {
                                    const s = STATUS_MAP[r.status] ?? STATUS_MAP.CLEAN
                                    return (
                                        <NeoTableRow key={r.id}>
                                            <NeoTableCell>
                                                <span className="font-mono font-bold text-primary text-sm">{r.name}</span>
                                            </NeoTableCell>
                                            <NeoTableCell>
                                                <span className="font-mono text-xs font-bold bg-secondary/60 px-2 py-0.5 rounded">{r.roomType?.code}</span>
                                                <span className="ml-2 text-xs text-muted-foreground">{r.roomType?.name}</span>
                                            </NeoTableCell>
                                            <NeoTableCell>
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${s.color}`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />{s.label}
                                                </span>
                                            </NeoTableCell>
                                            <NeoTableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {r.tags?.map(tag => (
                                                        <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-secondary/60 text-muted-foreground">
                                                            <Tag className="h-2.5 w-2.5" />{tag}
                                                        </span>
                                                    ))}
                                                    {(!r.tags || r.tags.length === 0) && <span className="text-muted-foreground text-xs">—</span>}
                                                </div>
                                            </NeoTableCell>
                                            <NeoTableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => openEdit(r)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border/50 bg-secondary/30 text-xs font-semibold transition-all hover:bg-secondary hover:border-primary/40">
                                                        <Pencil className="h-3 w-3" />Editar
                                                    </button>
                                                    <button onClick={() => handleDelete(r.id)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-destructive/20 bg-destructive/5 text-xs font-semibold text-destructive transition-all hover:bg-destructive/10">
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
