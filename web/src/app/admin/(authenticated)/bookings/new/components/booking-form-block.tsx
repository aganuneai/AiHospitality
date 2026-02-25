import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { format } from "date-fns"
import { NeoButton } from "@/components/neo/neo-button"
import { NeoCard, NeoCardHeader, NeoCardTitle, NeoCardContent } from "@/components/neo/neo-card"
import { BookingContextBlock } from "./booking-context-block"
import { DistributionBlock } from "./distribution-block"
import { GuestBlock } from "./guest-block"
import { RoomManagerBlock, RoomRequest } from "./room-manager-block"
import { RateCalculatorBlock } from "./rate-calculator-block"
import { PaymentBlock } from "./payment-block"
import { BookingConfirmationBlock } from "./booking-confirmation-block"
import { BillingResponsibilityBlock, PayerType } from "./billing-responsibility-block"
import { v4 as uuidv4 } from "uuid"
import { createReservationSchema } from "@/lib/schemas/booking/reservation-create.schema"
import { useQuotes } from "@/hooks/use-quotes"
import { usePartners } from "@/hooks/use-partners"
import { PieChart } from "lucide-react"

export function BookingFormBlock() {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [step, setStep] = useState<'ENTRY' | 'CONFIRM'>('ENTRY')

    // ── State ──────────────────────────────────────────────────────────
    const [checkIn, setCheckIn] = useState<Date | undefined>(new Date())
    const [checkOut, setCheckOut] = useState<Date | undefined>(new Date(Date.now() + 86400000)) // Tomorrow
    const [checkInTime, setCheckInTime] = useState('14:00')
    const [checkOutTime, setCheckOutTime] = useState('11:00')
    const [dist, setDist] = useState({ channel: 'DIRECT', source: 'PHONE', agencyId: '', commission: '' })
    const [guest, setGuest] = useState({ holderName: '', holderEmail: '', holderPhone: '', holderDoc: '' })
    const [rooms, setRooms] = useState<RoomRequest[]>([
        { id: '1', roomTypeId: '', adults: 2, children: 0, ratePlanId: '', status: 'PENDING' }
    ])
    const [payment, setPayment] = useState({ guaranteeType: 'NONE' as any, paymentToken: '', method: 'CC_PERSONAL', billTo: 'GUEST' as PayerType })
    const [availability, setAvailability] = useState<any[]>([])
    const [inventoryLoading, setInventoryLoading] = useState(false)

    // ── Availability & Inventory ──────────────────────────────────────
    const { partners, loading: partnersLoading } = usePartners()
    const selectedPartner = partners.find(p => p.id === dist.agencyId)

    const fetchAvailability = useCallback(() => {
        if (!checkIn || !checkOut) return

        setInventoryLoading(true)
        const params = new URLSearchParams({
            checkIn: format(checkIn, 'yyyy-MM-dd'),
            checkOut: format(checkOut, 'yyyy-MM-dd'),
            adults: rooms.reduce((acc, r) => acc + r.adults, 0).toString()
        })

        fetch(`/api/v1/availability?${params}`, {
            headers: {
                'x-hotel-id': 'HOTEL_001'
            }
        })
            .then(res => res.json())
            .then(data => {
                if (data.availability) {
                    setAvailability(data.availability)
                }
            })
            .catch(err => console.error(err))
            .finally(() => setInventoryLoading(false))
    }, [checkIn, checkOut, rooms.length]) // Triggered by date or room count changes

    useEffect(() => {
        fetchAvailability()
    }, [fetchAvailability])

    // ── Real-Time Quotes ───────────────────────────────────────────────
    const totalAdults = rooms.reduce((acc, r) => acc + r.adults, 0)
    const totalChildren = rooms.reduce((acc, r) => acc + r.children, 0)

    const { quotes, loading: quotesLoading } = useQuotes({ checkIn, checkOut, adults: totalAdults, children: totalChildren })

    const calculateTotal = () => {
        let subtotal = 0
        const selectedQuoteIds: string[] = []
        rooms.forEach(room => {
            if (!room.roomTypeId) return
            const quote = quotes.find(q => q.roomTypeCode === room.roomTypeId)
            if (quote) { subtotal += quote.total; selectedQuoteIds.push(quote.quoteId) }
        })
        return { subtotal, taxes: 0, total: subtotal, selectedQuoteIds }
    }

    const financials = calculateTotal()

    // ── Room Handlers ──────────────────────────────────────────────────
    const handleAddRoom = () =>
        setRooms([...rooms, { id: uuidv4(), roomTypeId: '', adults: 1, children: 0, ratePlanId: '', status: 'PENDING' }])

    const handleRemoveRoom = (id: string) => {
        if (rooms.length > 1) setRooms(rooms.filter(r => r.id !== id))
    }

    const handleUpdateRoom = (id: string, field: keyof RoomRequest, value: any) =>
        setRooms(rooms.map(r => r.id === id ? { ...r, [field]: value } : r))

    const handleDuplicateRoom = (room: RoomRequest) =>
        setRooms([...rooms, { ...room, id: uuidv4() }])

    // ── Field Handlers ─────────────────────────────────────────────────
    const handleDistChange = useCallback((field: string, value: any) => {
        setDist(prev => (prev as any)[field] === value ? prev : { ...prev, [field]: value })
    }, [])

    const handleGuestChange = useCallback((field: string, value: any) => {
        setGuest(prev => (prev as any)[field] === value ? prev : { ...prev, [field]: value })
    }, [])

    const handleTimesChange = (field: 'checkInTime' | 'checkOutTime', value: string) => {
        if (field === 'checkInTime') setCheckInTime(value)
        else setCheckOutTime(value)
    }

    const handleBillToChange = (value: PayerType) => {
        setPayment(prev => ({ ...prev, billTo: value }))
    }

    const handlePaymentMethodChange = (value: string) => {
        let guaranteeType = 'NONE'
        if (value === 'CC_PERSONAL') guaranteeType = 'CC'
        if (value === 'CASH') guaranteeType = 'PREPAID'
        if (value === 'INVOICE' || value === 'VOUCHER') guaranteeType = 'POSTPAID'

        setPayment(prev => ({ ...prev, method: value, guaranteeType }))
    }

    // ── Step Logic ─────────────────────────────────────────────────────
    const preparePayload = () => {
        return {
            checkIn: checkIn ? format(checkIn, 'yyyy-MM-dd') : undefined,
            checkInTime,
            checkOut: checkOut ? format(checkOut, 'yyyy-MM-dd') : undefined,
            checkOutTime,
            channel: dist.channel,
            source: dist.source,
            agencyId: dist.agencyId || undefined,
            commission: dist.commission ? parseFloat(dist.commission) : undefined,
            holderName: guest.holderName,
            holderEmail: guest.holderEmail,
            holderPhone: guest.holderPhone,
            holderDoc: guest.holderDoc || undefined,
            rooms: rooms.map(r => {
                const quote = quotes.find(q => q.roomTypeCode === r.roomTypeId)
                return { roomTypeId: r.roomTypeId, ratePlanId: r.ratePlanId || 'BAR', adults: r.adults, children: r.children, pricingSignature: quote?.pricingSignature }
            }),
            guaranteeType: payment.guaranteeType,
            paymentToken: payment.paymentToken || undefined,
            billTo: payment.billTo,
            quoteId: financials.selectedQuoteIds[0],
            notes: "Created via Admin Console (B2B Evolution)"
        }
    }

    const validateForm = () => {
        if (!checkIn || !checkOut) { toast.warning("Selecione datas de check-in e check-out."); return false }
        if (checkIn >= checkOut) { toast.warning("Data de check-out deve ser maior que check-in."); return false }
        if (!guest.holderName || guest.holderName.length < 3) { toast.warning("Nome do hóspede é obrigatório (mín. 3 caracteres)."); return false }
        if (!guest.holderPhone) { toast.warning("Telefone do hóspede é obrigatório."); return false }
        if (rooms.some(r => !r.roomTypeId)) { toast.warning("Selecione o tipo de quarto para todos os quartos."); return false }

        // B2B Validation
        if (payment.billTo === 'COMPANY' && !dist.agencyId) { toast.warning("Selecione uma Empresa para faturamento corporativo."); return false }
        if (payment.billTo === 'AGENCY' && !dist.agencyId) { toast.warning("Selecione uma Agência para faturamento de terceiro."); return false }

        const payload = preparePayload()
        const validation = createReservationSchema.safeParse(payload)
        if (!validation.success) {
            const allErrors = Object.values(validation.error.flatten().fieldErrors).flat()
            toast.warning(allErrors[0] ? String(allErrors[0]) : "Validação falhou. Verifique os campos.")
            return false
        }
        return true
    }

    const handleGoToConfirmation = () => {
        if (validateForm()) {
            setStep('CONFIRM')
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    const handleFinalConfirm = async () => {
        try {
            setIsSubmitting(true)
            const payload = preparePayload()

            const res = await fetch('/api/v1/admin/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!res.ok) {
                const rawText = await res.text()
                let details = "Failed to create booking"
                try { const err = JSON.parse(rawText); details = err.message || err.error || details } catch { details = rawText || `HTTP ${res.status}` }
                throw new Error(details)
            }

            const data = await res.json()
            const pnr = data.reservations?.[0]?.pnr || data.groupId
            toast.success(`Reserva confirmada!`, {
                description: `PNR: ${pnr} • Check-in: ${checkIn?.toLocaleDateString('pt-BR')}`,
                duration: 6000,
            })
            router.push('/admin/bookings')

        } catch (error: any) {
            console.error(error)
            toast.error("Erro ao criar reserva", { description: error.message })
        } finally {
            setIsSubmitting(false)
        }
    }

    // ── Render ─────────────────────────────────────────────────────────
    if (step === 'CONFIRM') {
        return (
            <BookingConfirmationBlock
                data={{
                    checkIn,
                    checkInTime,
                    checkOut,
                    checkOutTime,
                    guest,
                    rooms,
                    dist,
                    financials,
                    payment: { ...payment, paymentToken: payment.paymentToken || '' }
                }}
                onBack={() => setStep('ENTRY')}
                onConfirm={handleFinalConfirm}
                isSubmitting={isSubmitting}
            />
        )
    }

    return (
        <div className="space-y-8 pb-20 animate-in fade-in duration-700">
            {/* Premium Header - ZONE A (Top) */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/40">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black tracking-tighter italic font-heading text-foreground">
                        Nova Reserva <span className="text-indigo-600 text-2xl not-italic ml-2">Premium CRM</span>
                    </h1>
                    <p className="text-muted-foreground font-bold tracking-wide flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Crie e cote uma nova reserva com rastreamento comercial e B2B completo.
                    </p>
                </div>
                <div className="flex gap-4">
                    <NeoButton
                        variant="ghost"
                        onClick={() => router.back()}
                        className="h-12 px-6 rounded-2xl font-black uppercase tracking-widest text-muted-foreground"
                    >
                        Descartar
                    </NeoButton>
                    <NeoButton
                        className="h-12 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-black uppercase tracking-widest text-white shadow-xl shadow-indigo-600/20 transition-all hover:-translate-y-1"
                        onClick={handleGoToConfirmation}
                        disabled={isSubmitting}
                    >
                        Revisar & Confirmar
                    </NeoButton>
                </div>
            </div>

            {/* ZONE A: TRIP CONTEXT BAR */}
            <NeoCard className="bg-secondary/10 border-border/40" glass>
                <NeoCardContent className="p-6">
                    <BookingContextBlock
                        checkIn={checkIn}
                        checkOut={checkOut}
                        checkInTime={checkInTime}
                        checkOutTime={checkOutTime}
                        onDatesChange={(start, end) => { setCheckIn(start); setCheckOut(end) }}
                        onTimesChange={handleTimesChange}
                        status="PENDING"
                    />
                </NeoCardContent>
            </NeoCard>

            {/* ZONE B: DECISION GRID (3 COLUMNS) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* COL 1: GUEST */}
                <GuestBlock
                    holderName={guest.holderName}
                    holderEmail={guest.holderEmail}
                    holderPhone={guest.holderPhone}
                    holderDoc={guest.holderDoc}
                    onChange={handleGuestChange}
                />

                {/* COL 2: DISTRIBUTION & ENTITIES */}
                <DistributionBlock {...dist} onChange={handleDistChange} />

                {/* COL 3: BILLING & PAYER */}
                <BillingResponsibilityBlock
                    billTo={payment.billTo}
                    setBillTo={handleBillToChange}
                    paymentMethod={payment.method}
                    setPaymentMethod={handlePaymentMethodChange}
                    companyName={dist.channel === 'COMPANY' || dist.channel === 'CORPORATE' ? selectedPartner?.name : undefined}
                    agencyName={dist.channel === 'AGENCY' || dist.channel === 'OTA' ? selectedPartner?.name : undefined}
                />
            </div>

            {/* ZONE C: ROOMING LIST (Full Width) */}
            <div className="grid grid-cols-12 gap-6 items-start">
                <div className="col-span-12 lg:col-span-8">
                    <RoomManagerBlock
                        rooms={rooms}
                        availability={availability}
                        inventoryLoading={inventoryLoading}
                        onAddRoom={handleAddRoom}
                        onRemoveRoom={handleRemoveRoom}
                        onDuplicateRoom={handleDuplicateRoom}
                        onUpdateRoom={handleUpdateRoom}
                        quotes={quotes}
                    />
                </div>

                {/* ZONE D: FINANCIALS */}
                <div className="col-span-12 lg:col-span-4 space-y-6 sticky top-6">
                    <RateCalculatorBlock
                        subtotal={financials.subtotal}
                        taxes={financials.taxes}
                        discount={0}
                        total={financials.total}
                    />
                    <NeoCard className="bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-600/20 overflow-hidden">
                        <NeoCardContent className="p-6 flex items-center justify-between group overflow-hidden relative">
                            <div className="absolute right-0 top-0 opacity-10 -translate-y-4 translate-x-4 rotate-12 transition-transform group-hover:scale-110">
                                <PieChart className="w-32 h-32 text-white" />
                            </div>
                            <div className="relative z-10">
                                <h4 className="text-white font-black italic tracking-tighter uppercase text-sm mb-1.5">Live Rates Active</h4>
                                <p className="text-white font-bold text-xs leading-relaxed max-w-[180px]">
                                    Tarifas inteligentes aplicadas automaticamente com base em ocupação e período.
                                </p>
                                {quotesLoading && (
                                    <div className="mt-4 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white">Recalculando...</span>
                                    </div>
                                )}
                            </div>
                            <NeoButton
                                size="sm"
                                variant="outline"
                                className="relative z-10 border-white/60 text-white hover:bg-white hover:text-indigo-600 rounded-lg text-xs font-black uppercase tracking-tighter transition-all px-4"
                            >
                                Detalhes
                            </NeoButton>
                        </NeoCardContent>
                    </NeoCard>
                </div>
            </div>
        </div>
    )
}

