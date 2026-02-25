"use client"

import { NeoCard, NeoCardContent } from "@/components/neo/neo-card"
import { formatCurrency } from "@/lib/utils"

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
                    Visualização Financeira
                </h3>

                <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal (Diárias)</span>
                        <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                        <span>Taxas & Impostos</span>
                        <span>{formatCurrency(taxes)}</span>
                    </div>
                    <div className="flex justify-between text-green-500">
                        <span>Descontos</span>
                        <span>- {formatCurrency(discount)}</span>
                    </div>

                    <div className="pt-4 border-t border-primary/10 flex justify-between items-end mt-2">
                        <span className="text-sm font-bold uppercase text-foreground">Total Estimado</span>
                        <div className="text-right">
                            <span className="text-2xl font-bold font-heading text-primary block leading-none">
                                {formatCurrency(total)}
                            </span>
                            <span className="text-[10px] text-muted-foreground italic">Cotação em Reais</span>
                        </div>
                    </div>
                </div>
            </NeoCardContent>
        </NeoCard>
    )
}
