export default async function ConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return (
        <div className="min-h-screen bg-green-50/50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full border border-green-100">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
                    ✅
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
                <p className="text-muted-foreground mb-6">Your reservation has been successfully created.</p>

                <div className="bg-slate-50 p-4 rounded-lg mb-6 border border-slate-100">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Reservation ID</p>
                    <p className="font-mono text-xl font-bold">{id}</p>
                </div>

                <a href="/booking">
                    <button className="w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90 transition">
                        Back to Home
                    </button>
                </a>
            </div>
        </div>
    )
}
