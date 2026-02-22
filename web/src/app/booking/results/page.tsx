import { Suspense } from 'react' // For searchParams in Server Component
import { QuoteResult } from "@/lib/schemas/pricing/quote.schema";
import { QuoteCard } from "@/components/booking/quote-card"
import { Button } from "@/components/ui/button"
import Link from 'next/link'

async function getQuotes(searchParams: { checkIn: string, checkOut: string, adults: string }): Promise<QuoteResult[]> {
    try {
        const res = await fetch('http://localhost:3000/api/v1/quotes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-hotel-id': 'HOTEL_001' // Hardcoded for demo context
            },
            body: JSON.stringify({
                stay: {
                    checkIn: searchParams.checkIn,
                    checkOut: searchParams.checkOut,
                    adults: parseInt(searchParams.adults || '1'),
                }
            }),
            cache: 'no-store'
        })

        if (!res.ok) {
            console.error(await res.text())
            return []
        }

        const data = await res.json()
        return data.quotes || []
    } catch (e) {
        console.error("Fetch Error", e)
        return []
    }
}

export default async function ResultsPage({
    searchParams,
}: {
    searchParams: Promise<{ checkIn: string; checkOut: string; adults: string }>
}) {
    const params = await searchParams; // Next.js 15+ needs await, sticking to standard async pattern
    const quotes = await getQuotes(params);

    return (
        <div className="min-h-screen bg-muted/30 p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Available Rooms</h1>
                        <p className="text-muted-foreground">
                            {params.checkIn} - {params.checkOut} • {params.adults} Guests
                        </p>
                    </div>
                    <Link href="/booking">
                        <Button variant="outline">Modify Search</Button>
                    </Link>
                </div>

                {quotes.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                        <h3 className="text-lg font-medium text-muted-foreground">No rooms available for these dates.</h3>
                        <p className="mb-4">Please try different dates.</p>
                        <Link href="/booking">
                            <Button>Back to Search</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {/* 
                          Client Component Wrapper needed for interaction? 
                          QuoteCard has 'onBook' which implies client logic. 
                          Ideally we'd make QuoteCard client or pass a server action/link.
                          Let's make QuoteList a client component to handle navigation state.
                        */}
                        {quotes.map(quote => (
                            // In a real Server Component we'd likely link to checkout with ID
                            <Link key={quote.quoteId} href={`/booking/checkout?quoteId=${quote.quoteId}&pricingSignature=${quote.pricingSignature}&total=${quote.total}&room=${quote.roomTypeCode}`}>
                                <div className="cursor-pointer group">
                                    {/* Re-using QuoteCard but passing dummy handler or refactoring */}
                                    <div className="border rounded-lg p-6 bg-card hover:shadow-md transition-all flex justify-between items-center group-hover:border-primary/50">
                                        <div>
                                            <h3 className="text-xl font-bold">{quote.roomTypeCode}</h3>
                                            <div className="text-sm text-muted-foreground">{quote.ratePlanCode}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-primary">{quote.currency} {quote.total}</div>
                                            <Button className="mt-2">Select</Button>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
