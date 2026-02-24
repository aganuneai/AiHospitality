"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    LayoutDashboard,
    Calendar,
    Users,
    Settings,
    ChevronLeft,
    Menu,
    LogOut,
    Building2,
    CreditCard,
    BarChart3
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, createContext, useContext } from "react";

// Context for Sidebar State
const SidebarContext = createContext({ expanded: true, setExpanded: (v: boolean) => { } });

export function Sidebar({ children }: { children: React.ReactNode }) {
    const [expanded, setExpanded] = useState(true);

    return (
        <SidebarContext.Provider value={{ expanded, setExpanded }}>
            <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
                {/* Sidebar */}
                <aside
                    className={cn(
                        "h-screen sticky top-0 flex flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300 z-40",
                        expanded ? "w-64" : "w-16"
                    )}
                >
                    {/* Header */}
                    <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
                        <div className={cn("flex items-center gap-2 overflow-hidden", !expanded && "hidden")}>
                            <div className="bg-primary rounded-lg p-1.5">
                                <Building2 className="h-5 w-5 text-primary-foreground" />
                            </div>
                            <span className="font-bold text-lg tracking-tight">AiHospitality</span>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setExpanded(!expanded)}
                            className="text-sidebar-foreground hover:bg-sidebar-accent"
                        >
                            {expanded ? <ChevronLeft size={18} /> : <Menu size={18} />}
                        </Button>
                    </div>

                    {/* Navigation */}
                    <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
                        <NavGroup label="Operacional">
                            <NavItem icon={LayoutDashboard} label="Dashboard" href="/admin" />
                            <NavItem icon={Calendar} label="Reservas" href="/admin/bookings" />
                            <NavItem icon={Users} label="Hóspedes" href="/guests" />
                        </NavGroup>

                        <NavGroup label="Financeiro">
                            <NavItem icon={CreditCard} label="Pagamentos" href="/finance" />
                            <NavItem icon={BarChart3} label="Relatórios" href="/admin/analytics/reports" />
                        </NavGroup>

                        <NavGroup label="Sistema">
                            <NavItem icon={Settings} label="Configurações" href="/settings" />
                        </NavGroup>
                    </div>

                    {/* Footer / User Profile */}
                    <div className="p-3 border-t border-sidebar-border">
                        <div className={cn(
                            "flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent cursor-pointer transition-colors",
                            !expanded && "justify-center"
                        )}>
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs ring-2 ring-background">
                                AD
                            </div>
                            {expanded && (
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-sm font-medium truncate">Admin User</p>
                                    <p className="text-xs text-muted-foreground truncate">admin@hotel.com</p>
                                </div>
                            )}
                            {expanded && <LogOut size={16} className="text-muted-foreground hover:text-destructive" />}
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 overflow-auto">
                    {children}
                </main>
            </div>
        </SidebarContext.Provider>
    );
}

function NavGroup({ label, children }: { label: string, children: React.ReactNode }) {
    const { expanded } = useContext(SidebarContext);
    return (
        <div className="space-y-1">
            {expanded && (
                <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {label}
                </h3>
            )}
            {children}
        </div>
    );
}

function NavItem({ icon: Icon, label, href }: { icon: any, label: string, href: string }) {
    const { expanded } = useContext(SidebarContext);
    const pathname = usePathname();

    // Fix: Exact match for root paths, or strict prefix matching
    const isActive = href === '/admin'
        ? pathname === href
        : pathname === href || pathname.startsWith(`${href}/`);

    return (
        <Link href={href}>
            <div className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-all group relative",
                isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                !expanded && "justify-center px-2"
            )}>
                <Icon size={20} className={cn("shrink-0", isActive && "animate-in zoom-in-95")} />
                {expanded && <span className="text-sm font-medium truncate">{label}</span>}

                {/* Tooltip for collapsed state */}
                {!expanded && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                        {label}
                    </div>
                )}
            </div>
        </Link>
    );
}
