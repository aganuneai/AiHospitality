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
import { Hotel, PlusCircle, Pencil, Bed, Users, Download, Trash2, Check, X, AlertTriangle, AlertCircle } from "lucide-react"
import { toast } from "sonner"

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
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [blockingError, setBlockingError] = useState<string | null>(null)
    const [formError, setFormError] = useState<string | null>(null)

    const fetchRoomTypes = () => {
        setLoading(true)
        fetch("/api/v1/admin/room-types?propertyId=HOTEL_001")
            .then(res => res.json())
            .then(data => { setRoomTypes(Array.isArray(data) ? data : []); setLoading(false) })
            .catch(() => setLoading(false))
    }

    useEffect(() => { fetchRoomTypes() }, [])

    const openCreate = () => { setEditing(null); setForm(EMPTY); setFormError(null); setDialogOpen(true) }
    const openEdit = (rt: RoomType) => { setEditing(rt.id); setForm({ ...rt }); setFormError(null); setDialogOpen(true) }

    const handleSave = async () => {
        setSaving(true); setFormError(null)
        try {
            const method = editing ? "PUT" : "POST"
            const url = editing ? `/api/v1/admin/room-types/${editing}` : "/api/v1/admin/room-types"
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json", "x-hotel-id": "HOTEL_001" },
                body: JSON.stringify(form)
            })
            if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
            toast.success(editing ? "Tipo de quarto atualizado" : "Tipo de quarto criado")
            setDialogOpen(false); fetchRoomTypes()
        } catch (e: any) { setFormError(e.message) }
        finally { setSaving(false) }
    }

    const handleDelete = async () => {
        if (!deletingId) return
        setSaving(true)
        try {
            const res = await fetch(`/api/v1/admin/room-types/${deletingId}`, { method: "DELETE" })
            if (!res.ok) {
                const data = await res.json()
                setBlockingError(data.error || "Erro ao excluir tipo de quarto.")
                setDeletingId(null)
                return
            }
            toast.success("Tipo de quarto excluído com sucesso")
            setDeletingId(null)
            fetchRoomTypes()
        } catch (e: any) {
            console.error("Delete failed:", e)
            toast.error("Falha de conexão ao tentar excluir.")
        } finally {
            setSaving(false)
        }
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
                                    {formError && (
                                        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg border border-destructive/20 animate-in fade-in slide-in-from-top-1">
                                            <AlertCircle className="h-4 w-4" />
                                            {formError}
                                        </div>
                                    )}
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
                                                <button onClick={() => setDeletingId(rt.id)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-destructive/20 bg-destructive/5 text-xs font-semibold text-destructive transition-all hover:bg-destructive/10">
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

            {/* Modal de Confirmação de Exclusão */}
            <NeoDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
                <NeoDialogContent className="sm:max-w-[400px]">
                    <NeoDialogHeader className="bg-destructive/5 border-destructive/10">
                        <NeoDialogTitle className="text-destructive">Confirmar Exclusão</NeoDialogTitle>
                        <NeoDialogDescription>Esta ação é irreversível.</NeoDialogDescription>
                    </NeoDialogHeader>
                    <NeoDialogBody className="py-6 text-center">
                        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="h-8 w-8 text-destructive" />
                        </div>
                        <p className="font-medium text-foreground">Deseja realmente remover este tipo de quarto?</p>
                        <p className="text-xs text-muted-foreground mt-2 px-4">O sistema validará se existem dependências ativas antes de prosseguir.</p>
                    </NeoDialogBody>
                    <NeoDialogActions>
                        <button onClick={() => setDeletingId(null)} className="h-10 px-4 rounded-lg border border-border/50 text-sm font-semibold hover:bg-secondary">
                            Cancelar
                        </button>
                        <button onClick={handleDelete} disabled={saving} className="h-10 px-6 rounded-lg bg-destructive text-white text-sm font-semibold shadow-lg shadow-destructive/20 hover:bg-destructive/90 disabled:opacity-50">
                            {saving ? "Excluindo..." : "Confirmar Exclusão"}
                        </button>
                    </NeoDialogActions>
                </NeoDialogContent>
            </NeoDialog>

            {/* Modal de Erro de Bloqueio (Governança) */}
            <NeoDialog open={!!blockingError} onOpenChange={(open) => !open && setBlockingError(null)}>
                <NeoDialogContent className="sm:max-w-[450px]">
                    <NeoDialogHeader className="bg-amber-500/5 border-amber-500/10">
                        <NeoDialogTitle className="text-amber-600 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" /> Bloqueio de Segurança
                        </NeoDialogTitle>
                        <NeoDialogDescription>Ação impedida por dependências ativas.</NeoDialogDescription>
                    </NeoDialogHeader>
                    <NeoDialogBody className="py-6">
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-700 font-medium leading-relaxed">
                            {blockingError}
                        </div>
                        <p className="text-xs text-muted-foreground mt-4 text-center px-4">
                            Para excluir este tipo de quarto, você deve primeiro remover ou reatribuir todos os registros vinculados a ele.
                        </p>
                    </NeoDialogBody>
                    <NeoDialogActions>
                        <button onClick={() => setBlockingError(null)} className="w-full h-11 rounded-lg bg-secondary font-bold text-sm tracking-widest uppercase hover:bg-secondary/80">
                            Entendi
                        </button>
                    </NeoDialogActions>
                </NeoDialogContent>
            </NeoDialog>
        </div>
    )
}
