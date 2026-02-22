import { NeoButton } from "@/components/neo/neo-button";
import { NeoCard, NeoCardContent, NeoCardFooter, NeoCardHeader, NeoCardTitle } from "@/components/neo/neo-card";
import { Badge } from "@/components/ui/badge";
import { QuoteResult } from "@/lib/schemas/pricing/quote.schema";
import { Users, Check } from "lucide-react";

interface RoomCardProps {
    quote: QuoteResult;
    onBook: (quote: QuoteResult) => void;
}

export function RoomCard({ quote, onBook }: RoomCardProps) {
    return (
        <NeoCard className="flex flex-col h-full">
            <NeoCardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <NeoCardTitle className="text-xl font-bold">
                            {quote.roomTypeCode}
                        </NeoCardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            {quote.ratePlanCode} Rate
                        </p>
                    </div>
                </div>
            </NeoCardHeader>
            <NeoCardContent className="flex-1">
                <div className="space-y-4">
                    <div className="flex items-center text-sm text-muted-foreground">
                        <Users className="w-4 h-4 mr-2" />
                        <span>Up to 2 Guests</span>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center text-sm">
                            <Check className="w-4 h-4 mr-2 text-green-500" />
                            <span>Free Warning</span>
                        </div>
                        <div className="flex items-center text-sm">
                            <Check className="w-4 h-4 mr-2 text-green-500" />
                            <span>Breakfast Included</span>
                        </div>
                    </div>
                    <div className="pt-4 border-t border-border/40">
                        {quote.policies?.cancellation && (
                            <Badge variant={quote.policies.cancellation.type === 'FLEX' ? 'default' : 'secondary'} className="mb-2">
                                {quote.policies.cancellation.type === 'FLEX' ? 'Flexible Cancellation' : 'Non-Refundable'}
                            </Badge>
                        )}
                    </div>
                </div>
            </NeoCardContent>
            <NeoCardFooter className="flex-col items-stretch bg-muted/20 pt-4">
                <div className="flex justify-between items-end mb-4">
                    <div className="text-sm text-muted-foreground">Total Price</div>
                    <span className="text-2xl font-bold">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: quote.currency }).format(quote.total)}
                    </span>
                </div>
                <NeoButton variant="neo" onClick={() => onBook(quote)} className="w-full">
                    Reservar Agora
                </NeoButton>
            </NeoCardFooter>
        </NeoCard>
    );
}
