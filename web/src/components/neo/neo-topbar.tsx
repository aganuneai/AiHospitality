"use client"

import { Search, Bell, Settings, ChevronRight } from "lucide-react"
import { usePathname } from "next/navigation"

export function NeoTopbar() {
    const pathname = usePathname()
    const segments = pathname.split('/').filter(Boolean)

    // Simple breadcrumb generator
    const getBreadcrumbLabel = (segment: string) => {
        const labels: Record<string, string> = {
            admin: 'Sistema',
            bookings: 'Reservas',
            new: 'Nova',
            ari: 'ARI',
            events: 'Eventos',
            analytics: 'Analytics',
            occupancy: 'Ocupação',
            revenue: 'Receita',
            packages: 'Pacotes',
            upsell: 'Upsells',
            guests: 'Hóspedes',
            'room-types': 'Tipos de Quarto'
        }
        return labels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
    }

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/50 bg-background/80 px-8 backdrop-blur-xl">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm font-medium">
                {segments.map((segment, index) => {
                    const isLast = index === segments.length - 1;
                    return (
                        <div key={segment} className="flex items-center gap-2">
                            <span className={isLast ? "text-foreground font-bold tracking-tight" : "text-muted-foreground/70"}>
                                {getBreadcrumbLabel(segment)}
                            </span>
                            {!isLast && <ChevronRight className="w-4 h-4 text-muted-foreground/40" />}
                        </div>
                    )
                })}
            </div>

            {/* Global Actions */}
            <div className="flex items-center gap-4">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Pesquisar hóspedes, reservas..."
                        className="h-10 w-80 rounded-full border border-border/60 bg-secondary/30 pl-10 pr-4 text-sm font-medium outline-none transition-all placeholder:text-muted-foreground focus:border-primary/50 focus:bg-background focus:ring-4 focus:ring-primary/10"
                    />
                </div>

                <button className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border/50 bg-secondary/30 text-muted-foreground transition-all hover:bg-secondary hover:text-foreground">
                    <Bell className="w-5 h-5" />
                    <span className="absolute right-2.5 top-2.5 flex h-2 w-2 rounded-full bg-primary ring-2 ring-background"></span>
                </button>
            </div>
        </header>
    )
}
