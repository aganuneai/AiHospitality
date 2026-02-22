"use client"

import { NeoCard, NeoCardContent, NeoCardHeader, NeoCardTitle } from "@/components/neo/neo-card"
import { NeoButton } from "@/components/neo/neo-button"
import { Calendar, User, Home, CreditCard, ArrowLeft, CheckCircle2 } from "lucide-react"

interface BookingConfirmationBlockProps {
    data: {
        checkIn?: Date
        checkOut?: Date
        guest: { holderName: string, holderEmail: string, holderPhone: string, holderDoc: string }
        rooms: any[]
        dist: { channel: string, source: string }
        financials: { subtotal: number, taxes: number, total: number }
        payment: { guaranteeType: string }
    }
    onBack: () => void
    onConfirm: () => void
    isSubmitting: boolean
}

export function BookingConfirmationBlock({ data, onBack, onConfirm, isSubmitting }: BookingConfirmationBlockProps) {
    const nights = data.checkIn && data.checkOut
        ? Math.ceil((data.checkOut.getTime() - data.checkIn.getTime()) / (1000 * 60 * 60 * 24))
        : 0

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold font-heading uppercase tracking-tighter">Review Reservation</h2>
                <p className="text-muted-foreground">Verify all details with the guest before locking inventory.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Stay & Guest */}
                <div className="space-y-6">
                    <NeoCard glass>
                        <NeoCardHeader className="pb-2">
                            <NeoCardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-primary">
                                <Calendar className="w-4 h-4" /> Period & Guest
                            </NeoCardTitle>
                        </NeoCardHeader>
                        <NeoCardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 border-b border-border/10 pb-4">
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-muted-foreground block">Check-In</span>
                                    <span className="text-sm font-mono">{data.checkIn?.toLocaleDateString('pt-BR')}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-muted-foreground block">Check-Out</span>
                                    <span className="text-sm font-mono">{data.checkOut?.toLocaleDateString('pt-BR')}</span>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-xs font-bold text-primary italic">{nights} Nights Total</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-none bg-primary/10 flex items-center justify-center text-primary">
                                        <User className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold uppercase">{data.guest.holderName}</span>
                                        <span className="text-xs text-muted-foreground font-mono">{data.guest.holderEmail}</span>
                                    </div>
                                </div>
                                <div className="pl-11 text-xs text-muted-foreground">
                                    {data.guest.holderPhone} {data.guest.holderDoc && `• Doc: ${data.guest.holderDoc}`}
                                </div>
                            </div>
                        </NeoCardContent>
                    </NeoCard>

                    <NeoCard glass>
                        <NeoCardHeader className="pb-2">
                            <NeoCardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-primary">
                                <CreditCard className="w-4 h-4" /> Payment & Distribution
                            </NeoCardTitle>
                        </NeoCardHeader>
                        <NeoCardContent className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground uppercase text-[10px] font-bold">Guarantee</span>
                                <span className="font-mono">{data.payment.guaranteeType || "NONE"}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground uppercase text-[10px] font-bold">Channel / Source</span>
                                <span className="font-mono">{data.dist.channel} / {data.dist.source}</span>
                            </div>
                        </NeoCardContent>
                    </NeoCard>
                </div>

                {/* Rooms & Financials */}
                <div className="space-y-6">
                    <NeoCard glass className="border-l-4 border-l-primary">
                        <NeoCardHeader className="pb-2">
                            <NeoCardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-primary">
                                <Home className="w-4 h-4" /> Room Inventory
                            </NeoCardTitle>
                        </NeoCardHeader>
                        <NeoCardContent className="space-y-3">
                            {data.rooms.map((room, idx) => (
                                <div key={idx} className="flex justify-between items-center p-2 bg-muted/30 border border-border/10">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold uppercase leading-none">{room.roomTypeId || "NOT SELECTED"}</span>
                                        <span className="text-[10px] text-muted-foreground uppercase mt-1">{room.adults} Adults, {room.children} Children</span>
                                    </div>
                                    <span className="text-xs font-mono font-bold text-primary">
                                        UNIT #{idx + 1}
                                    </span>
                                </div>
                            ))}
                        </NeoCardContent>
                    </NeoCard>

                    <NeoCard glass className="bg-primary/5">
                        <NeoCardHeader className="pb-2">
                            <NeoCardTitle className="text-sm font-bold uppercase tracking-widest text-primary">
                                Financial Summary
                            </NeoCardTitle>
                        </NeoCardHeader>
                        <NeoCardContent className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground uppercase text-[10px] font-bold">Subtotal</span>
                                <span className="font-mono">${data.financials.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground uppercase text-[10px] font-bold">Taxes & Fees</span>
                                <span className="font-mono">${data.financials.taxes.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-primary/20">
                                <span className="text-primary font-bold uppercase tracking-tighter">Gross Total</span>
                                <span className="text-xl font-bold font-mono text-primary animate-pulse">
                                    ${data.financials.total.toFixed(2)}
                                </span>
                            </div>
                        </NeoCardContent>
                    </NeoCard>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 items-center justify-center pt-8">
                <NeoButton
                    variant="outline"
                    className="w-48 uppercase font-bold tracking-widest"
                    onClick={onBack}
                    disabled={isSubmitting}
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Edit
                </NeoButton>
                <NeoButton
                    variant="default"
                    className="w-48 bg-primary text-primary-foreground hover:bg-primary/90 uppercase font-bold tracking-widest shadow-xl shadow-primary/20"
                    onClick={onConfirm}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? "Finalizing..." : (
                        <>
                            <CheckCircle2 className="w-4 h-4 mr-2" /> Confirm & Book
                        </>
                    )}
                </NeoButton>
            </div>
        </div>
    )
}
