"use client"

import { NeoCard, NeoCardHeader, NeoCardTitle, NeoCardContent } from "@/components/neo/neo-card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { CreditCard, Wallet, Landmark, User, Building2, Briefcase } from "lucide-react"
import { cn } from "@/lib/utils"

export type PayerType = 'GUEST' | 'COMPANY' | 'AGENCY'

interface BillingResponsibilityBlockProps {
    billTo: PayerType
    setBillTo: (value: PayerType) => void
    paymentMethod: string
    setPaymentMethod: (value: string) => void
    companyName?: string
    agencyName?: string
}

export function BillingResponsibilityBlock({
    billTo,
    setBillTo,
    paymentMethod,
    setPaymentMethod,
    companyName,
    agencyName
}: BillingResponsibilityBlockProps) {
    return (
        <NeoCard className="h-full border-border/40 bg-background/50" glass>
            <NeoCardHeader className="pb-3 border-b border-border/20">
                <NeoCardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Wallet className="w-3 h-3 text-indigo-500" />
                    Responsabilidade Financeira
                </NeoCardTitle>
            </NeoCardHeader>
            <NeoCardContent className="pt-6 space-y-6">
                {/* Bill To Selector */}
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Faturar para (Bill To)</label>
                    <div className="grid grid-cols-1 gap-2">
                        {[
                            { id: 'GUEST', label: 'Hóspede (Direto)', icon: User, sub: 'Pagamento no check-in/out' },
                            { id: 'COMPANY', label: 'Empresa', icon: Building2, sub: companyName || 'Nenhuma empresa selecionada', disabled: !companyName },
                            { id: 'AGENCY', label: 'Agência', icon: Briefcase, sub: agencyName || 'Nenhuma agência selecionada', disabled: !agencyName },
                        ].map((item) => (
                            <button
                                key={item.id}
                                disabled={item.disabled}
                                onClick={() => setBillTo(item.id as any)}
                                className={cn(
                                    "flex items-center gap-4 p-3 rounded-xl border transition-all text-left group",
                                    billTo === item.id
                                        ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                                        : "bg-secondary/20 border-border/40 hover:bg-secondary/40",
                                    item.disabled && "opacity-40 grayscale cursor-not-allowed"
                                )}
                            >
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                    billTo === item.id ? "bg-white/20" : "bg-background"
                                )}>
                                    <item.icon className={cn("w-5 h-5", billTo === item.id ? "text-white" : "text-muted-foreground")} />
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-tighter">{item.label}</p>
                                    <p className={cn(
                                        "text-[10px] font-bold truncate max-w-[180px]",
                                        billTo === item.id ? "text-white/70" : "text-muted-foreground"
                                    )}>
                                        {item.sub}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-3 pt-4 border-t border-border/20">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Forma de Garantia</label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger className="h-12 bg-secondary/30 rounded-2xl border-border/40 font-bold">
                            <SelectValue placeholder="Selecione o método" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-border/40">
                            <SelectItem value="CC_PERSONAL" className="font-bold">Cartão de Crédito (Garantia)</SelectItem>
                            <SelectItem value="CASH" className="font-bold">Dinheiro / Pix (Antecipado)</SelectItem>
                            <SelectItem value="INVOICE" className="font-bold" disabled={billTo === 'GUEST'}>Faturamento / NF (Faturado)</SelectItem>
                            <SelectItem value="VOUCHER" className="font-bold" disabled={billTo === 'GUEST'}>Voucher / Full Credit</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-[9px] font-bold text-muted-foreground px-2 italic">
                        {billTo === 'GUEST'
                            ? "Nota: Hóspede é responsável por todos os extras."
                            : `Nota: ${billTo === 'COMPANY' ? 'Empresa' : 'Agência'} assumirá o faturamento conforme contrato.`
                        }
                    </p>
                </div>
            </NeoCardContent>
        </NeoCard>
    )
}
