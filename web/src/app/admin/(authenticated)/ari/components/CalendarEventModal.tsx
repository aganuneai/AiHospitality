"use client"

import * as React from "react"
import { useState } from "react"
import { Loader2, Save, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { useNeoMutation } from "@/hooks/use-neo-api"

interface CalendarEventModalProps {
    onSuccess: () => void
    eventToEdit?: {
        id: string
        title: string
        date: string
        type: string
        color: string
        description?: string
    }
    open?: boolean
    setOpen?: (open: boolean) => void
}

/**
 * CalendarEventModal Component
 * 
 * Allows users to register and manage events (local shows, holidays, etc.)
 * that impact demand and pricing strategies.
 */
export function CalendarEventModal({ onSuccess, eventToEdit, open: externalOpen, setOpen: setExternalOpen }: CalendarEventModalProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const open = externalOpen !== undefined ? externalOpen : internalOpen
    const setOpen = setExternalOpen !== undefined ? setExternalOpen : setInternalOpen

    const { toast } = useToast()
    const isEdit = !!eventToEdit

    const [form, setForm] = useState({
        id: eventToEdit?.id || "",
        title: eventToEdit?.title || "",
        date: eventToEdit ? new Date(eventToEdit.date).toISOString().split('T')[0] : "",
        type: eventToEdit?.type || "EVENT",
        color: eventToEdit?.color || "#3b82f6",
        description: eventToEdit?.description || ""
    })

    // Reset form when eventToEdit changes
    React.useEffect(() => {
        if (eventToEdit) {
            setForm({
                id: eventToEdit.id,
                title: eventToEdit.title,
                date: new Date(eventToEdit.date).toISOString().split('T')[0],
                type: eventToEdit.type,
                color: eventToEdit.color,
                description: eventToEdit.description || ""
            })
        } else {
            setForm({ id: "", title: "", date: "", type: "EVENT", color: "#3b82f6", description: "" })
        }
    }, [eventToEdit])

    const { mutate: saveMutate, loading: saving } = useNeoMutation('/api/v1/admin/calendar/events', {
        method: isEdit ? 'PUT' : 'POST',
        onSuccess: () => {
            toast({
                title: isEdit ? "Evento Atualizado" : "Evento Criado",
                description: isEdit ? "As alterações foram salvas." : "O evento foi adicionado ao calendário.",
            })
            setOpen(false)
            onSuccess()
            if (!isEdit) setForm({ id: "", title: "", date: "", type: "EVENT", color: "#3b82f6", description: "" })
        },
        onError: (err: any) => {
            toast({
                title: "Erro ao salvar",
                description: err.message || "Erro desconhecido",
                variant: 'destructive'
            })
        }
    })

    const { mutate: deleteMutate, loading: deleting } = useNeoMutation(`/api/v1/admin/calendar/events?id=${eventToEdit?.id}`, {
        method: 'DELETE',
        onSuccess: () => {
            toast({
                title: "Evento Excluído",
                description: "O evento foi removido do sistema.",
            })
            setOpen(false)
            onSuccess()
        },
        onError: (err: any) => {
            toast({
                title: "Erro ao excluir",
                description: err.message || "Erro desconhecido",
                variant: 'destructive'
            })
        }
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.title || !form.date) {
            toast({
                title: "Campos obrigatórios",
                description: "Título e Data devem ser preenchidos.",
                variant: 'destructive'
            })
            return
        }
        saveMutate(form)
    }

    const trigger = externalOpen === undefined ? (
        <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-2 border-primary/20 hover:bg-primary/5 text-xs font-semibold">
                <Plus className="w-3.5 h-3.5" /> Adicionar Evento
            </Button>
        </DialogTrigger>
    ) : null

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger}
            <DialogContent className="sm:max-w-[425px] bg-background/95 backdrop-blur-xl border-border/50">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="font-heading font-bold text-xl">
                            {isEdit ? 'Editar Evento' : 'Novo Evento de Calendário'}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground font-medium">
                            {isEdit ? 'Ajuste os detalhes do evento estratégico.' : 'Adicione feriados locais, shows ou eventos que impactam a demanda.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-5 py-6">
                        <div className="grid gap-2">
                            <Label htmlFor="title" className="text-xs font-bold uppercase text-muted-foreground">Título do Evento</Label>
                            <Input
                                id="title"
                                value={form.title}
                                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                placeholder="Ex: Show da Madonna, Feriado Municipal"
                                className="bg-secondary/5 border-border/50"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="date" className="text-xs font-bold uppercase text-muted-foreground">Data do Evento</Label>
                            <Input
                                id="date"
                                type="date"
                                value={form.date}
                                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                className="bg-secondary/5 border-border/50"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="type" className="text-xs font-bold uppercase text-muted-foreground">Tipo de Evento</Label>
                                <select
                                    id="type"
                                    value={form.type}
                                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                                    className="h-10 w-full rounded-md border border-border/50 bg-secondary/5 px-3 py-2 text-sm font-medium focus:ring-1 focus:ring-primary outline-none"
                                >
                                    <option value="EVENT">Evento Local</option>
                                    <option value="HOLIDAY">Feriado</option>
                                    <option value="PROMOTION">Promoção</option>
                                </select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="color" className="text-xs font-bold uppercase text-muted-foreground">Cor de Destaque</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="color"
                                        type="color"
                                        value={form.color}
                                        onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                                        className="h-10 w-12 p-1 border-border/50 bg-secondary/5"
                                    />
                                    <Input
                                        value={form.color}
                                        onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                                        className="h-10 flex-1 text-xs font-mono uppercase border-border/50 bg-secondary/5"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description" className="text-xs font-bold uppercase text-muted-foreground">Notas Estratégicas (Opcional)</Label>
                            <Input
                                id="description"
                                value={form.description}
                                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                placeholder="Detalhes sobre o impacto esperado..."
                                className="bg-secondary/5 border-border/50"
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex gap-2 sm:justify-between">
                        {isEdit && (
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={() => deleteMutate()}
                                disabled={deleting || saving}
                                className="bg-rose-500 hover:bg-rose-600 font-bold"
                            >
                                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Excluir'}
                            </Button>
                        )}
                        <Button type="submit" disabled={saving || deleting} className="flex-1 font-bold">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                            {isEdit ? 'Salvar Alterações' : 'Salvar Evento Estratégico'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
