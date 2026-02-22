import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { format } from "date-fns"
import { NeoButton } from "@/components/neo/neo-button"
import { BookingContextBlock } from "./booking-context-block"
import { DistributionBlock } from "./distribution-block"
import { GuestBlock } from "./guest-block"
import { RoomManagerBlock, RoomRequest } from "./room-manager-block"
import { RateCalculatorBlock } from "./rate-calculator-block"
import { PaymentBlock } from "./payment-block"
import { BookingConfirmationBlock } from "./booking-confirmation-block"
import { v4 as uuidv4 } from "uuid"
import { createReservationSchema } from "@/lib/schemas/booking/reservation-create.schema"
import { useQuotes } from "@/hooks/use-quotes"

export function BookingFormBlock() {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [step, setStep] = useState<'ENTRY' | 'CONFIRM'>('ENTRY')

    // ── State ──────────────────────────────────────────────────────────
    const [checkIn, setCheckIn] = useState<Date | undefined>(new Date())
    const [checkOut, setCheckOut] = useState<Date | undefined>(new Date(Date.now() + 86400000)) // Tomorrow
    const [dist, setDist] = useState({ channel: 'DIRECT', source: 'PHONE', agencyId: '', commission: '' })
    const [guest, setGuest] = useState({ holderName: '', holderEmail: '', holderPhone: '', holderDoc: '' })
    const [rooms, setRooms] = useState<RoomRequest[]>([
        { id: '1', roomTypeId: '', adults: 2, children: 0, ratePlanId: '', status: 'PENDING' }
    ])
    const [payment, setPayment] = useState({ guaranteeType: 'NONE' as any, paymentToken: '' })
    const [availability, setAvailability] = useState<any[]>([])
    const [inventoryLoading, setInventoryLoading] = useState(false)

    // ── Availability & Inventory ──────────────────────────────────────
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

    const handlePaymentChange = useCallback((data: { method: any, card?: any }) => {
        let guaranteeType = 'NONE'
        if (data.method === 'CREDIT_CARD') guaranteeType = 'CC'
        if (data.method === 'CASH') guaranteeType = 'PREPAID'
        setPayment(prev => {
            const newToken = data.method === 'CREDIT_CARD' ? 'tok_mock_' + data.card?.number?.slice(-4) : ''
            return prev.guaranteeType === guaranteeType && prev.paymentToken === newToken
                ? prev
                : { guaranteeType, paymentToken: newToken }
        })
    }, [])

    // ── Step Logic ─────────────────────────────────────────────────────
    const preparePayload = () => {
        return {
            checkIn: checkIn ? format(checkIn, 'yyyy-MM-dd') : undefined,
            checkOut: checkOut ? format(checkOut, 'yyyy-MM-dd') : undefined,
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
            quoteId: financials.selectedQuoteIds[0],
            notes: "Created via Admin Console"
        }
    }

    const validateForm = () => {
        if (!checkIn || !checkOut) { toast.warning("Selecione datas de check-in e check-out."); return false }
        if (checkIn >= checkOut) { toast.warning("Data de check-out deve ser maior que check-in."); return false }
        if (!guest.holderName || guest.holderName.length < 3) { toast.warning("Nome do hóspede é obrigatório (mín. 3 caracteres)."); return false }
        if (!guest.holderPhone) { toast.warning("Telefone do hóspede é obrigatório."); return false }
        if (rooms.some(r => !r.roomTypeId)) { toast.warning("Selecione o tipo de quarto para todos os quartos."); return false }

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
                    checkOut,
                    guest,
                    rooms,
                    dist,
                    financials,
                    payment
                }}
                onBack={() => setStep('ENTRY')}
                onConfirm={handleFinalConfirm}
                isSubmitting={isSubmitting}
            />
        )
    }

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-700">
            {/* Premium Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/40">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight font-heading text-foreground">
                        Nova Reserva
                    </h1>
                    <p className="text-muted-foreground font-medium tracking-wide">
                        Crie e cote uma nova reserva com rastreamento comercial completo.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => router.back()}
                        className="inline-flex h-10 items-center justify-center rounded-lg border border-border/50 bg-secondary/30 px-4 py-2 text-sm font-semibold text-foreground transition-all hover:bg-secondary hover:text-foreground"
                    >
                        Cancelar
                    </button>
                    <button
                        className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
                        onClick={handleGoToConfirmation}
                        disabled={isSubmitting}
                    >
                        Revisar & Reservar
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 lg:col-span-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <BookingContextBlock
                            checkIn={checkIn}
                            checkOut={checkOut}
                            onDatesChange={(s, e) => { setCheckIn(s); setCheckOut(e) }}
                            status="PENDING"
                        />
                        <DistributionBlock {...dist} onChange={handleDistChange} />
                    </div>
                    <GuestBlock
                        holderName={guest.holderName}
                        holderEmail={guest.holderEmail}
                        holderPhone={guest.holderPhone}
                        holderDoc={guest.holderDoc}
                        onChange={handleGuestChange}
                    />
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
                    <PaymentBlock onChange={handlePaymentChange} />
                </div>

                <div className="col-span-12 lg:col-span-4 space-y-6">
                    <RateCalculatorBlock
                        subtotal={financials.subtotal}
                        taxes={financials.taxes}
                        discount={0}
                        total={financials.total}
                    />
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400">
                        <strong>Live Rates Active:</strong><br />
                        Rates are fetched dynamically based on LOS and Occupancy.
                        {quotesLoading && <span className="block mt-1 animate-pulse">Updating rates...</span>}
                    </div>
                </div>
            </div>
        </div>
    )
}

