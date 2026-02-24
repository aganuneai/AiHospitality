'use client';

import { useState, useEffect } from 'react';
import {
    Users,
    Search,
    Mail,
    Phone,
    FileText,
    RefreshCw,
    UserPlus,
    Filter,
    Download,
    TrendingUp,
    Star,
    Crown,
    CheckCircle2,
    Calendar,
    ChevronRight,
    MoreHorizontal,
    Edit2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GuestRegistrationView } from './components/GuestRegistrationView';
import { GuestProfileDialog } from './components/GuestProfileDialog';
import { GuestStats } from './components/GuestStats';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { NeoCard, NeoCardContent, NeoButton } from '@/components/neo';

export default function GuestsPage() {
    const [guests, setGuests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
    const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    useEffect(() => {
        loadGuests();
    }, []);

    async function loadGuests(query?: string) {
        setLoading(true);
        try {
            const url = query
                ? `/api/v1/admin/guests/search?q=${query}`
                : `/api/v1/admin/guests`;

            const response = await fetch(url, {
                headers: { 'x-hotel-id': 'HOTEL_001' }
            });
            const data = await response.json();
            setGuests(data.guests || []);
        } catch (error) {
            console.error("Erro ao carregar hóspedes:", error);
        } finally {
            setLoading(false);
        }
    }

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        loadGuests(searchTerm);
    }

    const mockStats = {
        total: 1248,
        vips: 156,
        inHouse: 42,
        newThisMonth: 28,
    };

    return (
        <div className="p-8 space-y-8 max-w-[1600px] mx-auto bg-background/50 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Gestão de Hóspedes</h1>
                    <p className="text-muted-foreground mt-2 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Gerencie perfis, fidelidade e histórico de estadias em 360º.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="gap-2 rounded-xl h-12 px-6 border-border/60 hover:bg-secondary/20 transition-all">
                        <Download className="h-4 w-4" />
                        Exportar
                    </Button>
                    <Button
                        className="gap-2 rounded-xl h-12 px-6 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all active:scale-[0.98] bg-indigo-600 hover:bg-indigo-500"
                        onClick={() => {
                            setSelectedGuestId(null);
                            setIsRegistrationOpen(true);
                        }}
                    >
                        <UserPlus className="h-4 w-4" />
                        Novo Hóspede
                    </Button>
                </div>
            </div>

            {isRegistrationOpen ? (
                <GuestRegistrationView
                    guestId={selectedGuestId}
                    onClose={() => {
                        setIsRegistrationOpen(false);
                        setSelectedGuestId(null);
                    }}
                    onSuccess={() => loadGuests(searchTerm)}
                />
            ) : (
                <>
                    <GuestStats stats={mockStats} />
                    {/* ... rest of the list ... */}

                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Main Content */}
                        <div className="flex-1 space-y-6">
                            <Card className="border-border/40 shadow-sm bg-card/30 backdrop-blur-sm">
                                <CardHeader className="pb-3 border-b border-border/40">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-4 flex-1">
                                            <form onSubmit={handleSearch} className="relative flex-1 max-w-md group">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                                <Input
                                                    placeholder="Busca inteligente por nome, e-mail..."
                                                    className="pl-12 bg-background/40 border-border/40 h-11 rounded-xl focus:ring-primary/20 transition-all"
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                />
                                            </form>
                                            <div className="hidden sm:flex gap-2">
                                                <Button variant="ghost" size="sm" className="rounded-lg h-11 gap-2 text-muted-foreground">
                                                    <Filter className="w-4 h-4" />
                                                    Filtros
                                                </Button>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => loadGuests()} disabled={loading} className="h-11 w-11 rounded-xl hover:bg-secondary/40">
                                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-hidden">
                                        <Table>
                                            <TableHeader className="bg-muted/30">
                                                <TableRow className="hover:bg-transparent">
                                                    <TableHead className="pl-8 py-5">Perfil do Hóspede</TableHead>
                                                    <TableHead>Nível</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>LTV</TableHead>
                                                    <TableHead className="text-right pr-8">Ações</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {loading && guests.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="h-64 text-center">
                                                            <div className="flex flex-col items-center justify-center gap-4">
                                                                <div className="relative">
                                                                    <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                                                                </div>
                                                                <span className="text-sm font-bold text-muted-foreground">Sincronizando base de hóspedes...</span>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ) : guests.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="h-64 text-center">
                                                            <div className="flex flex-col items-center justify-center gap-3">
                                                                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                                                                    <Users className="h-8 w-8 text-muted-foreground/40" />
                                                                </div>
                                                                <p className="text-muted-foreground font-bold italic">Nenhum hóspede encontrado</p>
                                                                <Button variant="link" onClick={() => { setSearchTerm(''); loadGuests(); }} className="text-primary font-bold uppercase text-xs tracking-widest">Ver Todos</Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    guests.map((guest) => (
                                                        <TableRow
                                                            key={guest.id}
                                                            className="group hover:bg-primary/[0.03] transition-all cursor-pointer border-b border-border/20 last:border-0 h-20"
                                                            onClick={() => {
                                                                setSelectedGuestId(guest.id);
                                                                setIsProfileOpen(true);
                                                            }}
                                                        >
                                                            <TableCell className="pl-8">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="relative group/avatar">
                                                                        <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20 group-hover/avatar:border-primary transition-colors">
                                                                            {guest.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                                                        </div>
                                                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-background rounded-full" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-bold text-sm leading-none flex items-center gap-2 group-hover:text-primary transition-colors">
                                                                            {guest.fullName}
                                                                        </p>
                                                                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">{guest.email || 'Sem e-mail cadastrado'}</p>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-2">
                                                                    <Badge className={cn(
                                                                        "rounded-lg px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest",
                                                                        guest.id.includes('1') ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                                                            guest.id.includes('2') ? "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" :
                                                                                "bg-secondary/50 text-muted-foreground border-border/40"
                                                                    )}>
                                                                        {guest.id.includes('1') ? "Gold VIP" : guest.id.includes('2') ? "Platinum" : "Silver"}
                                                                    </Badge>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className={cn(
                                                                        "w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)]",
                                                                        guest.id.includes('a') ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/30"
                                                                    )} />
                                                                    <span className="text-xs font-bold text-muted-foreground/80 uppercase tracking-tighter">
                                                                        {guest.id.includes('a') ? "Em Casa" : "Reservado"}
                                                                    </span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm font-mono font-bold">R$ 4.250</span>
                                                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                                                        <TrendingUp className="w-3 h-3 text-emerald-500" />
                                                                        +12% vs last
                                                                    </span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right pr-8">
                                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-9 w-9 rounded-lg hover:bg-primary/10 hover:text-primary"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedGuestId(guest.id);
                                                                            setIsProfileOpen(true);
                                                                        }}
                                                                    >
                                                                        <Search className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-9 w-9 rounded-lg hover:bg-secondary/40"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedGuestId(guest.id);
                                                                            setIsRegistrationOpen(true);
                                                                        }}
                                                                    >
                                                                        <Edit2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Sidebar Context */}
                        <div className="w-full lg:w-80 space-y-6">
                            <NeoCard className="border-primary/20 bg-primary/5 shadow-lg border-dashed">
                                <NeoCardContent className="p-6">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                                            <Star className="w-5 h-5 text-primary" />
                                        </div>
                                        <h3 className="font-bold text-sm tracking-tight">Destaques</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="p-3 bg-background/40 rounded-xl border border-border/40">
                                            <p className="text-[10px] uppercase font-extrabold text-muted-foreground mb-1">Top Guest</p>
                                            <p className="text-sm font-bold truncate">Alexander Bond</p>
                                            <p className="text-xs text-emerald-500 font-mono mt-1">LTV: R$ 45.200</p>
                                        </div>
                                        <div className="p-3 bg-background/40 rounded-xl border border-border/40">
                                            <p className="text-[10px] uppercase font-extrabold text-muted-foreground mb-1">Média de Satisfação</p>
                                            <div className="flex items-center gap-1 mt-1">
                                                {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-3 h-3 text-amber-500 fill-amber-500" />)}
                                                <span className="text-xs font-bold ml-2">4.9/5.0</span>
                                            </div>
                                        </div>
                                    </div>
                                </NeoCardContent>
                            </NeoCard>

                            <NeoCard className="border-border/40 shadow-sm">
                                <NeoCardContent className="p-6">
                                    <h3 className="font-bold text-sm tracking-tight mb-4 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        Atividade Recente
                                    </h3>
                                    <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-border/60">
                                        <div className="relative pl-6">
                                            <div className="absolute left-[6px] top-1.5 w-2 h-2 rounded-full bg-primary border-2 border-background" />
                                            <p className="text-xs font-bold leading-none">Novo Cadastro</p>
                                            <p className="text-[10px] text-muted-foreground mt-1">Há 10 minutos</p>
                                        </div>
                                        <div className="relative pl-6">
                                            <div className="absolute left-[6px] top-1.5 w-2 h-2 rounded-full bg-border border-2 border-background" />
                                            <p className="text-xs font-bold leading-none">Upgrade de Nível: Gold</p>
                                            <p className="text-[10px] text-muted-foreground mt-1">Há 2 horas</p>
                                        </div>
                                        <div className="relative pl-6 opacity-60">
                                            <div className="absolute left-[6px] top-1.5 w-2 h-2 rounded-full bg-border border-2 border-background" />
                                            <p className="text-xs font-bold leading-none font-italic italic">Relatório Mensal Enviado</p>
                                            <p className="text-[10px] text-muted-foreground mt-1">Ontem</p>
                                        </div>
                                    </div>
                                </NeoCardContent>
                            </NeoCard>
                        </div>
                    </div>

                </>
            )}

            <GuestProfileDialog
                guestId={selectedGuestId}
                isOpen={isProfileOpen}
                onClose={() => {
                    setIsProfileOpen(false);
                    setSelectedGuestId(null);
                }}
            />
        </div>
    );
}
