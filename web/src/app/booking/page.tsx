"use client";

import { useEffect, useState } from "react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Loader2, Search } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";

import { RoomCard } from "./components/room-card";
import { BookingForm, BookingFormData } from "./components/booking-form";
import { QuoteResult } from "@/lib/schemas/pricing/quote.schema";
import { BookRequest, BookResponse, Guest } from '@/lib/schemas/booking/booking.schema';
import { v4 } from "uuid";

interface GuestSelection {
    adults: number;
    children: number;
}

export default function BookingPage() {
    const [date, setDate] = useState<DateRange | undefined>({
        from: new Date(),
        to: addDays(new Date(), 2),
    });
    const [guests, setGuests] = useState<GuestSelection>({ adults: 2, children: 0 });
    const [quotes, setQuotes] = useState<QuoteResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedQuote, setSelectedQuote] = useState<QuoteResult | null>(null);
    const [bookingResult, setBookingResult] = useState<BookResponse | null>(null);
    const [isBooking, setIsBooking] = useState(false);

    // Mock Context for now - ideally comes from URL or Global Config
    const HOTEL_ID = "HOTEL_001";

    useEffect(() => {
        // Auto-search on load or valid changes could go here
    }, []);

    const handleSearch = async () => {
        if (!date?.from || !date?.to) return;

        setIsLoading(true);
        setQuotes([]);
        setSelectedQuote(null);
        setBookingResult(null);

        try {
            const requestId = v4();
            const res = await fetch('/api/v1/quotes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-hotel-id': HOTEL_ID,
                    'x-domain': 'PROPERTY',
                    'x-request-id': requestId
                },
                body: JSON.stringify({
                    stay: {
                        checkIn: format(date.from, 'yyyy-MM-dd'),
                        checkOut: format(date.to, 'yyyy-MM-dd'),
                        adults: guests.adults,
                        children: guests.children
                    }
                })
            });

            const contentType = res.headers.get("content-type");
            let data;
            if (contentType && contentType.includes("application/json")) {
                data = await res.json();
            } else {
                const text = await res.text();
                console.error("API Response Error (Non-JSON):", text);
                throw new Error(`API returned ${res.status}: ${res.statusText}`);
            }

            if (res.ok) {
                setQuotes(data.quotes);
            } else {
                console.error("Search failed", data);
            }
        } catch (error) {
            console.error("Search error", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleBookingSubmit = async (guestData: BookingFormData) => {
        if (!selectedQuote || !date?.from || !date?.to) return;

        setIsBooking(true);
        try {
            const payload: BookRequest = {
                context: {
                    domain: 'PROPERTY',
                    hotelId: HOTEL_ID,
                    requestId: v4()
                },
                idempotencyKey: v4(),
                quote: {
                    quoteId: selectedQuote.quoteId,
                    pricingSignature: selectedQuote.pricingSignature,
                },
                stay: {
                    checkIn: format(date.from, 'yyyy-MM-dd'),
                    checkOut: format(date.to, 'yyyy-MM-dd'),
                    adults: guests.adults,
                    children: guests.children,
                    roomTypeCode: selectedQuote.roomTypeCode,
                    ratePlanCode: selectedQuote.ratePlanCode,
                },
                guest: {
                    primaryGuestName: `${guestData.firstName} ${guestData.lastName}`,
                    email: guestData.email,
                    phone: guestData.phone
                }
            };

            const res = await fetch('/api/v1/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-hotel-id': HOTEL_ID,
                    'x-domain': 'PROPERTY',
                    'x-request-id': payload.context.requestId
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok) {
                setBookingResult(data.booking);
                // Close modal implicitly by UI state update or explicit action if needed
            } else {
                alert(`Erro na reserva: ${data.message || 'Desconhecido'}`);
            }
        } catch (error) {
            console.error("Booking error", error);
            alert("Erro ao processar reserva.");
        } finally {
            setIsBooking(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
            {/* Hero & Search Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 shadow-sm">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                                Reservas Online
                            </h1>
                            <p className="text-sm text-slate-500">Encontre a estadia perfeita</p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                            {/* Date Picker */}
                            <div className="grid gap-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            id="date"
                                            variant={"outline"}
                                            className={cn(
                                                "w-[300px] justify-start text-left font-normal",
                                                !date && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date?.from ? (
                                                date.to ? (
                                                    <>
                                                        {format(date.from, "PPP", { locale: ptBR })} -{" "}
                                                        {format(date.to, "PPP", { locale: ptBR })}
                                                    </>
                                                ) : (
                                                    format(date.from, "PPP", { locale: ptBR })
                                                )
                                            ) : (
                                                <span>Selecione as datas</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            initialFocus
                                            mode="range"
                                            defaultMonth={date?.from}
                                            selected={date}
                                            onSelect={setDate}
                                            numberOfMonths={2}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Guests Popover could go here, omitting for brevity/mvp, using fixed 2 adults default in state */}

                            <Button onClick={handleSearch} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                                Buscar
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <main className="container mx-auto px-4 py-8">
                {isLoading && (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                    </div>
                )}

                {!isLoading && quotes.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {quotes.map((quote) => (
                            <RoomCard
                                key={quote.quoteId}
                                quote={quote}
                                onBook={(q) => setSelectedQuote(q)}
                            />
                        ))}
                    </div>
                )}

                {!isLoading && quotes.length === 0 && !bookingResult && (
                    <div className="text-center py-20 text-slate-500">
                        Selecione datas e clique em buscar para ver as opções disponíveis.
                    </div>
                )}
            </main>

            {/* Booking Modal */}
            <Dialog open={!!selectedQuote && !bookingResult} onOpenChange={(open) => !open && setSelectedQuote(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Finalizar Reserva</DialogTitle>
                        <DialogDescription>
                            Preencha seus dados para confirmar a reserva do quarto {selectedQuote?.roomTypeCode}.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedQuote && (
                        <div className="bg-slate-50 p-4 rounded-md mb-4 text-sm">
                            <div className="flex justify-between">
                                <span>Total:</span>
                                <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: selectedQuote.currency }).format(selectedQuote.total)}</span>
                            </div>
                        </div>
                    )}
                    <BookingForm onSubmit={handleBookingSubmit} isLoading={isBooking} />
                </DialogContent>
            </Dialog>

            {/* Success Modal */}
            <Dialog open={!!bookingResult} onOpenChange={(open) => !open && setBookingResult(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-green-600">Reserva Confirmada!</DialogTitle>
                        <DialogDescription>
                            Sua reserva foi realizada com sucesso.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-2">
                        <p><strong>Código da Reserva:</strong> {bookingResult?.pnr}</p>
                        <p><strong>ID:</strong> {bookingResult?.reservationId}</p>
                        <p className="text-sm text-slate-500">Um email de confirmação foi enviado.</p>
                    </div>
                    <Button onClick={() => setBookingResult(null)} className="w-full">
                        Fechar
                    </Button>
                </DialogContent>
            </Dialog>
        </div>
    );
}
