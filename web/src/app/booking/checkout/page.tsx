"use client"

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { NeoCard, NeoCardContent, NeoCardDescription, NeoCardHeader, NeoCardTitle } from "@/components/neo/neo-card"
import { Input } from "@/components/ui/input"
import { NeoButton } from "@/components/neo/neo-button"
import { v4 } from 'uuid';

function CheckoutForm() {
    const searchParams = useSearchParams()
    const router = useRouter()

    const quoteId = searchParams.get('quoteId')
    const pricingSignature = searchParams.get('pricingSignature')
    const total = searchParams.get('total')
    const room = searchParams.get('room')

    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    const handleBook = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        try {
            const idempotencyKey = v4();
            const res = await fetch('/api/v1/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-hotel-id': 'HOTEL_001' },
                body: JSON.stringify({
                    idempotencyKey, quoteId, pricingSignature,
                    stay: { checkIn: "2024-12-01", checkOut: "2024-12-05", adults: 1 },
                    roomTypeCode: room, ratePlanCode: "RACK",
                    primaryGuest: { firstName, lastName, email }
                })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.message || 'Booking failed')
            router.push(`/booking/confirmation/${data.booking.reservationId}`)
        } catch (err) {
            setError((err as Error).message)
        } finally {
            setIsLoading(false)
        }
    }

    if (!quoteId) return <div>Invalid Booking Session</div>

    return (
        <div className="min-h-screen bg-muted/30 p-4 md:p-8 flex items-center justify-center">
            <NeoCard className="w-full max-w-lg">
                <NeoCardHeader>
                    <NeoCardTitle>Secure Checkout</NeoCardTitle>
                    <NeoCardDescription>Finalize your reservation for {room}</NeoCardDescription>
                </NeoCardHeader>
                <NeoCardContent>
                    <div className="bg-secondary/20 p-4 mb-6">
                        <div className="flex justify-between font-bold">
                            <span>Total</span>
                            <span>USD {total}</span>
                        </div>
                    </div>
                    <form onSubmit={handleBook} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">First Name</label>
                                <Input required value={firstName} onChange={e => setFirstName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Last Name</label>
                                <Input required value={lastName} onChange={e => setLastName(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email</label>
                            <Input required type="email" value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                        {error && (
                            <div className="text-destructive text-sm bg-destructive/10 p-2">
                                {error}
                            </div>
                        )}
                        <NeoButton type="submit" className="w-full" variant="neo" disabled={isLoading}>
                            {isLoading ? "Processing..." : "Confirm Reservation"}
                        </NeoButton>
                    </form>
                </NeoCardContent>
            </NeoCard>
        </div>
    )
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={<div>Loading checkout...</div>}>
            <CheckoutForm />
        </Suspense>
    )
}
