"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    LayoutDashboard,
    CalendarCheck,
    Users,
    CalendarRange,
    LineChart,
    Wallet,
    History,
    Hotel,
    Package as PackageIcon,
    ArrowUpCircle,
    Settings,
    ShieldCheck,
    Activity,
    DoorClosed,
    BadgeDollarSign,
    Handshake,
    BedDouble
} from "lucide-react"

type NavItem = {
    title: string;
    href: string;
    icon: React.ReactNode;
}

type NavGroup = {
    label: string;
    items: NavItem[];
}

const NAVIGATION: NavGroup[] = [
    {
        label: "Recepção & Reservas",
        items: [
            { title: "Dashboard", href: "/admin", icon: <LayoutDashboard size={18} /> },
            { title: "Nova Reserva", href: "/admin/bookings/new", icon: <CalendarCheck size={18} /> },
            { title: "Lista de Reservas", href: "/admin/bookings", icon: <CalendarRange size={18} /> },
            { title: "Hóspedes", href: "/admin/guests", icon: <Users size={18} /> },
        ]
    },
    {
        label: "Receita & Inventário",
        items: [
            { title: "Mapa ARI", href: "/admin/ari", icon: <CalendarRange size={18} /> },
            { title: "Ocupação", href: "/admin/analytics/occupancy", icon: <LineChart size={18} /> },
            { title: "Auditoria de Receita", href: "/admin/analytics/revenue", icon: <Wallet size={18} /> },
        ]
    },
    {
        label: "Cadastros",
        items: [
            { title: "Tipos de Quarto", href: "/admin/room-types", icon: <BedDouble size={18} /> },
            { title: "Quartos Físicos", href: "/admin/rooms", icon: <DoorClosed size={18} /> },
            { title: "Rate Plans", href: "/admin/rate-plans", icon: <BadgeDollarSign size={18} /> },
            { title: "Parceiros", href: "/admin/partners", icon: <Handshake size={18} /> },
        ]
    },
    {
        label: "Produtos & Monetização",
        items: [
            { title: "Pacotes", href: "/admin/packages", icon: <PackageIcon size={18} /> },
            { title: "Upsells", href: "/admin/upsell", icon: <ArrowUpCircle size={18} /> },
        ]
    },
    {
        label: "Configurações",
        items: [
            { title: "Auditoria Global", href: "/admin/audit", icon: <ShieldCheck size={18} /> },
            { title: "Status do Sistema", href: "/admin/health", icon: <Activity size={18} /> },
            { title: "Ajustes Globais", href: "/admin/settings", icon: <Settings size={18} /> },
        ]
    }
]

export function NeoSidebar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    const pathname = usePathname()

    return (
        <aside className={cn("pb-12 w-72 border-r border-border/50 bg-sidebar/80 backdrop-blur-xl h-screen sticky top-0 flex flex-col shadow-sm transition-all duration-300", className)} {...props}>
            <div className="space-y-6 py-6 h-full flex flex-col overflow-y-auto custom-scrollbar">

                {/* Brand Header */}
                <div className="px-6 py-2 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
                        <Hotel className="text-primary-foreground" size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-foreground font-heading">
                            AiHospitality
                        </h2>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Premium PMS</p>
                    </div>
                </div>

                <div className="flex-1 px-4 space-y-6">
                    {NAVIGATION.map((group, i) => (
                        <div key={i} className="space-y-2">
                            <h4 className="px-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
                                {group.label}
                            </h4>
                            <div className="space-y-1">
                                {group.items.map((item) => {
                                    const allItems = NAVIGATION.flatMap(g => g.items);
                                    const isActive = pathname === item.href || (
                                        pathname.startsWith(item.href) &&
                                        item.href !== '/admin' &&
                                        !allItems.some(other =>
                                            other.href !== item.href &&
                                            pathname.startsWith(other.href) &&
                                            other.href.length > item.href.length
                                        )
                                    );
                                    return (
                                        <Link key={item.href} href={item.href}>
                                            <div className={cn(
                                                "group flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                                                isActive
                                                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                                                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                                            )}>
                                                <span className={cn(
                                                    "transition-colors",
                                                    isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
                                                )}>
                                                    {item.icon}
                                                </span>
                                                <span className="tracking-wide">{item.title}</span>
                                            </div>
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer User Info */}
                <div className="mt-auto px-6 py-4 border-t border-border/40 mx-4 rounded-2xl bg-secondary/30 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-xs font-bold text-primary-foreground shadow-sm">
                            AD
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold text-foreground">Ana Silva</span>
                            <span className="text-[11px] text-muted-foreground/80 font-medium tracking-wide">Gerente Geral</span>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    )
}
