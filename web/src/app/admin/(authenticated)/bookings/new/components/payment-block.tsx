
"use client"

import { NeoCard, NeoCardHeader, NeoCardTitle, NeoCardContent } from "@/components/neo/neo-card"
import { Lock } from "lucide-react"
import { PaymentMethodSelector } from "@/components/payment/PaymentMethodSelector"
import { CreditCardInput } from "@/components/payment/CreditCardInput"
import { PaymentMethodType, CreditCard } from "@/lib/schemas/payment/payment.schema"
import { useState, useEffect } from "react"

interface PaymentBlockProps {
    onChange?: (data: { method: PaymentMethodType, card?: Partial<CreditCard> }) => void
}

export function PaymentBlock({ onChange }: PaymentBlockProps) {
    const [method, setMethod] = useState<PaymentMethodType>('TRANSFER') // Default to Transfer
    const [card, setCard] = useState<Partial<CreditCard>>({})

    // Propagate changes
    useEffect(() => {
        onChange?.({ method, card: method === 'CREDIT_CARD' ? card : undefined })
    }, [method, card, onChange])

    return (
        <NeoCard className="bg-muted/30">
            <NeoCardHeader className="pb-3 border-b border-white/5">
                <NeoCardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Lock className="w-3 h-3 text-primary" />
                    Block 7: Guarantee & Payment
                </NeoCardTitle>
            </NeoCardHeader>
            <NeoCardContent className="pt-6 space-y-6">

                <div className="space-y-4">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Payment Method</label>
                    <PaymentMethodSelector
                        value={method}
                        onChange={setMethod}
                    />
                </div>

                {method === 'CREDIT_CARD' && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                        <CreditCardInput
                            value={card}
                            onChange={(field, val) => setCard(prev => ({ ...prev, [field]: val }))}
                        />
                        <p className="text-[10px] text-muted-foreground mt-2 text-center">
                            <Lock className="w-3 h-3 inline mr-1" />
                            Data is end-to-end encrypted. No card data stored on local server.
                        </p>
                    </div>
                )}

            </NeoCardContent>
        </NeoCard>
    )
}

