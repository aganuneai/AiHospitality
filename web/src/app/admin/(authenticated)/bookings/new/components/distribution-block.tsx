"use client"

import { NeoCard, NeoCardHeader, NeoCardTitle, NeoCardContent } from "@/components/neo/neo-card"
import { NeoInput } from "@/components/neo/neo-input"

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { usePartners, PartnerType } from "@/hooks/use-partners"
import { Loader2 } from "lucide-react"

interface DistributionBlockProps {
    channel: string
    source: string
    agencyId?: string
    commission?: string
    onChange: (field: string, value: any) => void
}

export function DistributionBlock({ channel, source, agencyId, commission, onChange }: DistributionBlockProps) {
    const { partners, loading } = usePartners()

    // Mapping internal types to labels
    const isAgencyRequired = channel !== 'DIRECT'

    // Filter partners based on channel
    const filteredPartners = partners.filter(p => p.type === channel)

    return (
        <NeoCard className="h-full">
            <NeoCardHeader className="pb-3 border-b border-white/5">
                <NeoCardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
                    Block 2: Commercial Distribution
                </NeoCardTitle>
            </NeoCardHeader>
            <NeoCardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Channel</label>
                        <Select value={channel} onValueChange={(v) => onChange('channel', v)}>
                            <SelectTrigger className="w-full h-9 rounded-none bg-background/50 border-input">
                                <SelectValue placeholder="Select Channel" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="DIRECT">Direct</SelectItem>
                                <SelectItem value="OTA">OTA (Expedia, Booking...)</SelectItem>
                                <SelectItem value="AGENCY">Agência de Viagens</SelectItem>
                                <SelectItem value="COMPANY">Empresa / Convênio</SelectItem>
                                <SelectItem value="CORPORATE">Corporativo / Eventos</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Source</label>
                        <Select value={source} onValueChange={(v) => onChange('source', v)}>
                            <SelectTrigger className="w-full h-9 rounded-none bg-background/50 border-input">
                                <SelectValue placeholder="Select Origin" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="PHONE">Phone</SelectItem>
                                <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                                <SelectItem value="WALK_IN">Walk-in</SelectItem>
                                <SelectItem value="WEBSITE">Website</SelectItem>
                                <SelectItem value="EMAIL">Email</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Conditional Agency/Commission */}
                <div className={`space-y-4 transition-all duration-300 ${isAgencyRequired ? 'opacity-100' : 'opacity-50 grayscale'}`}>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-2">
                            Agency / Corporate
                            {isAgencyRequired && <span className="text-red-500">*</span>}
                        </label>
                        <Select value={agencyId} onValueChange={(v) => onChange('agencyId', v)} disabled={!isAgencyRequired || loading}>
                            <SelectTrigger className="w-full h-9 rounded-none bg-background/50 border-input">
                                <SelectValue placeholder={loading ? "Carregando..." : "Selecione o Parceiro"} />
                            </SelectTrigger>
                            <SelectContent>
                                {loading ? (
                                    <div className="flex items-center justify-center p-2">
                                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                    </div>
                                ) : filteredPartners.length > 0 ? (
                                    filteredPartners.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name} ({p.code})</SelectItem>
                                    ))
                                ) : (
                                    <div className="p-2 text-xs text-muted-foreground text-center italic">
                                        Nenhum parceiro {channel} encontrado
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Commission (%)</label>
                        <NeoInput
                            type="number"
                            placeholder="0.00"
                            value={commission}
                            onChange={(e) => onChange('commission', e.target.value)}
                            disabled={!agencyId && !isAgencyRequired}
                        />
                    </div>
                </div>
            </NeoCardContent>
        </NeoCard>
    )
}
