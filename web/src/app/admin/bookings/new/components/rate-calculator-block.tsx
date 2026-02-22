"use client"

import { NeoCard, NeoCardContent } from "@/components/neo/neo-card"

interface RateCalculatorBlockProps {
    subtotal: number
    taxes: number
    discount: number
    total: number
}

export function RateCalculatorBlock({ subtotal, taxes, discount, total }: RateCalculatorBlockProps) {
    return (
        <NeoCard className="bg-primary/5 border-primary/20 sticky top-4">
            <NeoCardContent className="pt-6 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-primary/10 pb-2">
                    Block 6: Financial Summary
                </h3>

                <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal (Room Charges)</span>
                        <span>$ {subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                        <span>Taxes & Fees</span>
                        <span>$ {taxes.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-green-500">
                        <span>Discounts</span>
                        <span>- $ {discount.toFixed(2)}</span>
                    </div>

                    <div className="pt-4 border-t border-primary/10 flex justify-between items-end mt-2">
                        <span className="text-sm font-bold uppercase text-foreground">Total Estimate</span>
                        <div className="text-right">
                            <span className="text-2xl font-bold font-heading text-primary block leading-none">
                                $ {total.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">USD</span>
                        </div>
                    </div>
                </div>
            </NeoCardContent>
        </NeoCard>
    )
}
