"use client"

import * as React from "react"
import { useState } from "react"
import { format, differenceInDays, isValid, parseISO } from "date-fns"
import { CalendarIcon, Loader2, Save, Info, AlertCircle, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

import { cn } from "@/lib/utils"
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
import { useNeoFetch } from "@/hooks/use-neo-api"
import { AriGridResponse } from "@/lib/types/ari"

interface BulkUpdateModalProps {
    roomTypes: { id: string, name: string }[]
    ratePlans: { code: string, name: string }[]
    onSuccess: () => void
    disabled?: boolean
}

export function BulkUpdateModal({ roomTypes, ratePlans, onSuccess, disabled }: BulkUpdateModalProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [warnings, setWarnings] = useState<string[]>([])
    const { toast } = useToast()

    // Form State
    const [fromDate, setFromDate] = useState<string>("")
    const [toDate, setToDate] = useState<string>("")
    const [selectedRoomTypes, setSelectedRoomTypes] = useState<string[]>([])
    const [ratePlanCode, setRatePlanCode] = useState<string>("")
    const [daysOfWeek, setDaysOfWeek] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]) // 0=Sun, 1=Mon...

    // Toggles for fields to update
    const [updateFields, setUpdateFields] = useState({
        price: false,
        available: false,
        minLOS: false,
        maxLOS: false,
        closedToArrival: false,
        closedToDeparture: false,
        closed: false,
    })

    // Field Values
    const [fieldValues, setFieldValues] = useState({
        price: "",
        available: "",
        minLOS: "",
        maxLOS: "",
        closedToArrival: false,
        closedToDeparture: false,
        closed: false,
        overrideManual: false
    })

    // Validation
    const validateDates = () => {
        if (!fromDate || !toDate) return "Both dates are required."
        const dFrom = parseISO(fromDate)
        const dTo = parseISO(toDate)
        if (!isValid(dFrom) || !isValid(dTo)) return "Invalid dates."
        if (dFrom > dTo) return "End date must be after start date."
        const diff = differenceInDays(dTo, dFrom)
        if (diff > 180) return `Date range cannot exceed 180 days (currently ${diff} days).`
        return null
    }

    const toggleRoomType = (id: string) => {
        if (id === 'ALL') {
            if (selectedRoomTypes.length === roomTypes.length) {
                setSelectedRoomTypes([])
            } else {
                setSelectedRoomTypes(roomTypes.map(rt => rt.id))
            }
            return
        }

        if (selectedRoomTypes.includes(id)) {
            setSelectedRoomTypes(prev => prev.filter(r => r !== id))
        } else {
            setSelectedRoomTypes(prev => [...prev, id])
        }
    }

    const toggleFieldUpdate = (field: keyof typeof updateFields) => {
        setUpdateFields(prev => ({ ...prev, [field]: !prev[field] }))
    }

    const toggleDayOfWeek = (day: number) => {
        setDaysOfWeek(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
    }

    const handleValueChange = (field: keyof typeof fieldValues, value: any) => {
        setFieldValues(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async () => {
        setError(null)
        setWarnings([])
        const dateError = validateDates()
        if (dateError) return setError(dateError)
        if (selectedRoomTypes.length === 0) return setError("At least one room type must be selected.")
        if (!ratePlanCode) return setError("A rate plan must be selected.")

        const hasFieldsToUpdate = Object.values(updateFields).some(v => v)
        if (!hasFieldsToUpdate) return setError("Select at least one field to update.")

        const payload: any = {
            fromDate,
            toDate,
            roomTypeIds: selectedRoomTypes,
            overrideManual: fieldValues.overrideManual,
            ratePlanCode,
            daysOfWeek,
            fields: {}
        }

        if (updateFields.price) payload.fields.price = Number(fieldValues.price)
        if (updateFields.available) payload.fields.available = parseInt(fieldValues.available)
        if (updateFields.minLOS) payload.fields.minLOS = parseInt(fieldValues.minLOS)
        if (updateFields.maxLOS) payload.fields.maxLOS = parseInt(fieldValues.maxLOS)
        if (updateFields.closedToArrival) payload.fields.closedToArrival = fieldValues.closedToArrival
        if (updateFields.closedToDeparture) payload.fields.closedToDeparture = fieldValues.closedToDeparture
        if (updateFields.closed) payload.fields.closed = fieldValues.closed

        setLoading(true)
        try {
            const res = await fetch('/api/v1/admin/ari/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-hotel-id': 'HOTEL_001' },
                body: JSON.stringify(payload)
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.message || data.error || 'Failed to apply updates')

            if (data.warnings && data.warnings.length > 0) {
                setWarnings(data.warnings)
                toast({
                    title: "Atualização com Limites",
                    description: "Alguns valores foram ajustados à capacidade física.",
                })
                // We don't close the modal immediately if there are warnings so they can see which ones
                onSuccess() // Refresh grid though
            } else {
                setOpen(false)
                toast({
                    title: "Sucesso",
                    description: "Atualizações aplicadas com sucesso.",
                })
                onSuccess()
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // Determine 'All' checkbox state
    const allSelected = selectedRoomTypes.length === roomTypes.length && roomTypes.length > 0
    const someSelected = selectedRoomTypes.length > 0 && !allSelected

    return (
        <>
            <Button disabled={disabled} onClick={() => setOpen(true)} type="button" className="font-semibold shadow-sm hover:-translate-y-0.5 transition-all">
                <span className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    Atualização em Massa
                </span>
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[700px] border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl p-0 overflow-hidden sm:rounded-2xl">
                    <div className="p-6 bg-secondary/10 border-b border-border/40">
                        <DialogTitle className="text-xl font-bold font-heading flex items-center gap-2 text-foreground">
                            <Save className="w-5 h-5 text-primary" />
                            Operações em Massa (ARI)
                        </DialogTitle>
                        <DialogDescription className="mt-2 text-sm text-muted-foreground font-medium">
                            Aplique alterações em lote para Disponibilidade, Tarifas e Restrições.
                            As operações são atômicas e limitadas a uma janela de 180 dias.
                        </DialogDescription>
                    </div>

                    <div className="p-6 space-y-8 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">

                        {error && (
                            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3 text-rose-500 shadow-sm">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <p className="text-sm font-semibold">{error}</p>
                            </div>
                        )}

                        {warnings.length > 0 && (
                            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2 text-amber-600 shadow-sm">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 shrink-0" />
                                    <p className="text-sm font-bold text-amber-700">Atenção: Limites Atingidos</p>
                                </div>
                                <ul className="list-disc pl-10 text-xs font-semibold space-y-1">
                                    {warnings.map((w, i) => <li key={i}>{w}</li>)}
                                </ul>
                                <p className="text-[10px] italic mt-2">Clique em Cancelar para fechar agora que você revisou os ajustes.</p>
                            </div>
                        )}

                        {/* Section: Date Range */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-2">1. Período e Dias da Semana</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-foreground">Data Inicial</Label>
                                    <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="bg-secondary/20 border-border/40 shadow-sm" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-foreground">Data Final</Label>
                                    <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="bg-secondary/20 border-border/40 shadow-sm" />
                                </div>
                            </div>

                            <div className="space-y-2 mt-4">
                                <Label className="text-xs font-semibold text-foreground">Dias da Semana Aplicáveis</Label>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { label: 'Dom', value: 0 },
                                        { label: 'Seg', value: 1 },
                                        { label: 'Ter', value: 2 },
                                        { label: 'Qua', value: 3 },
                                        { label: 'Qui', value: 4 },
                                        { label: 'Sex', value: 5 },
                                        { label: 'Sab', value: 6 }
                                    ].map(day => (
                                        <button
                                            key={day.value}
                                            type="button"
                                            onClick={() => toggleDayOfWeek(day.value)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-sm",
                                                daysOfWeek.includes(day.value)
                                                    ? "bg-primary text-primary-foreground border-primary"
                                                    : "bg-background text-muted-foreground border-border/50 hover:bg-secondary/20 hover:text-foreground"
                                            )}
                                        >
                                            {day.label}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-muted-foreground font-medium">As modificações apenas afetarão as datas que caírem nos dias selecionados.</p>
                            </div>
                        </div>

                        {/* Section: Targets */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-2">2. Acomodações Alvo e Plano Tarifário</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Room Types */}
                                <div className="space-y-3">
                                    <label className="text-xs font-semibold text-foreground">Tipos de Quarto</label>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-secondary/10 hover:bg-secondary/30 cursor-pointer transition-colors shadow-sm">
                                            <input type="checkbox" checked={allSelected} ref={input => { if (input) input.indeterminate = someSelected }} onChange={() => toggleRoomType('ALL')} className="w-4 h-4 accent-primary rounded border-border" />
                                            <span className="text-sm font-bold text-foreground">Todos os Tipos</span>
                                        </label>
                                        <div className="grid grid-cols-1 gap-2 pl-2">
                                            {roomTypes.map(rt => (
                                                <label key={rt.id} className="flex items-center gap-3 cursor-pointer group">
                                                    <input type="checkbox" checked={selectedRoomTypes.includes(rt.id)} onChange={() => toggleRoomType(rt.id)} className="w-4 h-4 accent-primary rounded border-border" />
                                                    <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{rt.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Rate Plan */}
                                <div className="space-y-3">
                                    <label className="text-xs font-semibold text-foreground flex items-center gap-1">Plano Tarifário Alvo <span className="text-rose-500">*</span></label>
                                    <p className="text-[10px] text-muted-foreground font-medium mb-2">As alterações serão aplicadas exclusivamente à linha tarifária selecionada abaixo.</p>
                                    <select
                                        value={ratePlanCode}
                                        onChange={e => setRatePlanCode(e.target.value)}
                                        className="w-full bg-background border border-border/40 rounded-xl text-sm p-3 focus:outline-hidden focus:ring-2 focus:ring-primary font-medium shadow-sm transition-all"
                                    >
                                        <option value="" disabled>Selecione um Rate Plan...</option>
                                        {ratePlans.map(rp => (
                                            <option key={rp.code} value={rp.code}>{rp.name} ({rp.code})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Section: Modifications */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-2">3. Modificações da Matriz</h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                {/* Price */}
                                <div className="flex items-center gap-3">
                                    <input type="checkbox" checked={updateFields.price} onChange={() => toggleFieldUpdate('price')} className="w-4 h-4 accent-primary rounded border-border" />
                                    <div className="flex-1">
                                        <Label className="text-xs font-semibold">Diária (USD/BRL)</Label>
                                        <Input type="number" step="0.01" disabled={!updateFields.price} value={fieldValues.price} onChange={e => handleValueChange('price', e.target.value)} className="mt-1 h-9 shadow-sm" placeholder="0.00" />
                                    </div>
                                </div>

                                {/* Inventory */}
                                <div className="flex items-center gap-3">
                                    <input type="checkbox" checked={updateFields.available} onChange={() => toggleFieldUpdate('available')} className="w-4 h-4 accent-primary rounded border-border" />
                                    <div className="flex-1">
                                        <Label className="text-xs font-semibold">Inventário (Vagas)</Label>
                                        <Input type="number" disabled={!updateFields.available} value={fieldValues.available} onChange={e => handleValueChange('available', e.target.value)} className="mt-1 h-9 shadow-sm" placeholder="Ex: 5" />
                                    </div>
                                </div>

                                {/* Min LOS */}
                                <div className="flex items-center gap-3">
                                    <input type="checkbox" checked={updateFields.minLOS} onChange={() => toggleFieldUpdate('minLOS')} className="w-4 h-4 accent-primary rounded border-border" />
                                    <div className="flex-1">
                                        <Label className="text-xs font-semibold">Mín. Noites (Min LOS)</Label>
                                        <Input type="number" disabled={!updateFields.minLOS} value={fieldValues.minLOS} onChange={e => handleValueChange('minLOS', e.target.value)} className="mt-1 h-9 shadow-sm" placeholder="1" />
                                    </div>
                                </div>

                                {/* Max LOS */}
                                <div className="flex items-center gap-3">
                                    <input type="checkbox" checked={updateFields.maxLOS} onChange={() => toggleFieldUpdate('maxLOS')} className="w-4 h-4 accent-primary rounded border-border" />
                                    <div className="flex-1">
                                        <Label className="text-xs font-semibold">Máx. Noites (Max LOS)</Label>
                                        <Input type="number" disabled={!updateFields.maxLOS} value={fieldValues.maxLOS} onChange={e => handleValueChange('maxLOS', e.target.value)} className="mt-1 h-9 shadow-sm" placeholder="30" />
                                    </div>
                                </div>

                                {/* CTA */}
                                <label className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-secondary/10 hover:bg-secondary/30 cursor-pointer col-span-1 md:col-span-2 shadow-sm transition-colors">
                                    <div className="flex items-center gap-3">
                                        <input type="checkbox" checked={updateFields.closedToArrival} onChange={() => toggleFieldUpdate('closedToArrival')} className="w-4 h-4 accent-primary rounded border-border" />
                                        <span className="text-sm font-bold text-foreground">Fechado para Chegada (CTA)</span>
                                    </div>
                                    <select disabled={!updateFields.closedToArrival} value={fieldValues.closedToArrival ? 'true' : 'false'} onChange={e => handleValueChange('closedToArrival', e.target.value === 'true')} className="bg-background border border-border/40 rounded-lg text-sm p-1.5 focus:outline-hidden focus:ring-2 focus:ring-primary font-medium shadow-sm">
                                        <option value="true">Ativar CTA</option>
                                        <option value="false">Desativar CTA</option>
                                    </select>
                                </label>

                                {/* CTD */}
                                <label className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-secondary/10 hover:bg-secondary/30 cursor-pointer col-span-1 md:col-span-2 shadow-sm transition-colors">
                                    <div className="flex items-center gap-3">
                                        <input type="checkbox" checked={updateFields.closedToDeparture} onChange={() => toggleFieldUpdate('closedToDeparture')} className="w-4 h-4 accent-primary rounded border-border" />
                                        <span className="text-sm font-bold text-foreground">Fechado para Saída (CTD)</span>
                                    </div>
                                    <select disabled={!updateFields.closedToDeparture} value={fieldValues.closedToDeparture ? 'true' : 'false'} onChange={e => handleValueChange('closedToDeparture', e.target.value === 'true')} className="bg-background border border-border/40 rounded-lg text-sm p-1.5 focus:outline-hidden focus:ring-2 focus:ring-primary font-medium shadow-sm">
                                        <option value="true">Ativar CTD</option>
                                        <option value="false">Desativar CTD</option>
                                    </select>
                                </label>

                                {/* Closed (Stop Sell) */}
                                <div className="col-span-1 md:col-span-2 mt-2">
                                    <label className="flex items-center justify-between p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 cursor-pointer transition-colors shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <input type="checkbox" checked={updateFields.closed} onChange={() => toggleFieldUpdate('closed')} className="w-5 h-5 accent-rose-500 rounded border-border" />
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-rose-500">Stop Sell (Vendas Encerradas)</span>
                                                <p className="text-xs font-medium text-rose-500/80 mt-0.5">Bloqueia totalmente a venda para estas datas</p>
                                            </div>
                                        </div>
                                        <select disabled={!updateFields.closed} value={fieldValues.closed ? 'true' : 'false'} onChange={e => handleValueChange('closed', e.target.value === 'true')} className="bg-background border border-rose-500/30 rounded-lg text-sm p-2 focus:outline-hidden focus:ring-2 focus:ring-rose-500 font-bold text-rose-500 shadow-sm">
                                            <option value="true">Ativar Block</option>
                                            <option value="false">Liberar Vendas</option>
                                        </select>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Section: Advanced Settings */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-2 flex items-center gap-2">
                                4. Opções Avançadas
                                <Info className="w-3.5 h-3.5" />
                            </h4>

                            <label className="flex items-start gap-4 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 cursor-pointer shadow-sm">
                                <input type="checkbox" checked={fieldValues.overrideManual} onChange={e => handleValueChange('overrideManual', e.target.checked)} className="w-5 h-5 accent-amber-500 mt-1 rounded border-border" />
                                <div className="flex-1 space-y-1">
                                    <span className="text-sm font-bold text-amber-500">Forçar Sobrescrita nos Canais (Override)</span>
                                    <p className="text-xs font-medium text-amber-500/80 leading-relaxed">
                                        Se ativado, esta atualização forçará o Channel Manager (Expedia, Booking.com, etc) a sobrescrever quaisquer limites manuais definidos anteriormente nas suas extranets.
                                    </p>
                                </div>
                            </label>
                        </div>

                    </div>

                    <div className="p-6 bg-secondary/10 border-t border-border/40 flex items-center justify-end gap-3 rounded-b-2xl">
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={loading} className="font-semibold shadow-sm hover:bg-secondary">
                            Cancelar
                        </Button>
                        <Button onClick={handleSubmit} disabled={loading} className="font-bold relative overflow-hidden group min-w-[160px] shadow-md hover:-translate-y-0.5 transition-all">
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                            ) : (
                                "Executar Lote"
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
