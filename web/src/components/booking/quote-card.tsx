"use client"

import { QuoteResult } from "@/lib/schemas/pricing/quote.schema";
import { NeoCard, NeoCardContent, NeoCardDescription, NeoCardFooter, NeoCardHeader, NeoCardTitle } from "@/components/neo/neo-card"
import { NeoButton } from "@/components/neo/neo-button"
// import { Badge } from "lucide-react" 
// import { formatCurrency } from "@/lib/utils"

export function QuoteCard({ quote, onBook }: { quote: QuoteResult, onBook: (quote: QuoteResult) => void }) {
    return (
        <NeoCard className="flex flex-col md:flex-row overflow-hidden">
            <div className="w-full md:w-1/3 bg-muted flex items-center justify-center text-muted-foreground p-4">
                {/* Placeholder Image */}
                <div className="text-center">
                    <span className="block text-4xl mb-2">🛏️</span>
                    <span>{quote.roomTypeCode}</span>
                </div>
            </div>
            <div className="flex-1 flex flex-col justify-between">
                <NeoCardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <NeoCardTitle className="text-xl mb-1">{quote.roomTypeCode}</NeoCardTitle>
                            <NeoCardDescription>{quote.ratePlanCode === 'RACK' ? 'Standard Rate' : quote.ratePlanCode}</NeoCardDescription>
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-bold block">{quote.currency} {quote.total.toFixed(2)}</span>
                            <span className="text-xs text-muted-foreground">Total for stay</span>
                        </div>
                    </div>
                </NeoCardHeader>
                <NeoCardContent>
                    <div className="text-sm text-muted-foreground space-y-1">
                        <p>Policy: {quote.policies.cancellation.type}</p>
                        <p>Includes: Breakfast, Wi-Fi</p>
                    </div>
                </NeoCardContent>
                <NeoCardFooter className="bg-secondary/20 justify-end p-4">
                    <NeoButton variant="neo" onClick={() => onBook(quote)}>Book Now</NeoButton>
                </NeoCardFooter>
            </div>
        </NeoCard>
    )
}
