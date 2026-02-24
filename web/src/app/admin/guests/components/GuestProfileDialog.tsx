'use client';

import { useState, useEffect } from 'react';
import {
    NeoDialog,
    NeoDialogContent,
    NeoDialogHeader,
    NeoDialogTitle,
    NeoDialogDescription,
    NeoDialogBody,
    NeoDialogActions
} from "@/components/neo/neo-dialog";
import { NeoCard, NeoCardContent } from '@/components/neo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    User,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Diamond,
    Star,
    History,
    TrendingUp,
    ShieldCheck,
    CreditCard,
    AlertCircle,
    Utensils,
    Bed,
    MoreHorizontal,
    ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GuestProfileDialogProps {
    guestId: string | null;
    isOpen: boolean;
    onClose: () => void;
}

export function GuestProfileDialog({ guestId, isOpen, onClose }: GuestProfileDialogProps) {
    const [guest, setGuest] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && guestId) {
            loadGuest();
        }
    }, [guestId, isOpen]);

    async function loadGuest() {
        setLoading(true);
        try {
            const response = await fetch(`/api/v1/admin/guests/${guestId}`, {
                headers: { 'x-hotel-id': 'HOTEL_001' }
            });
            const data = await response.json();
            setGuest(data);
        } catch (error) {
            console.error("Erro ao carregar perfil:", error);
        } finally {
            setLoading(false);
        }
    }

    if (!guest && !loading) return null;

    return (
        <NeoDialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
            <NeoDialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <NeoDialogHeader className="pb-6 border-b border-border/40">
                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                        <div className="relative group/profile">
                            <div className="w-24 h-24 rounded-3xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-3xl font-extrabold text-primary group-hover/profile:border-primary transition-all">
                                {guest?.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-amber-500 text-background px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border-2 border-background shadow-lg shadow-amber-500/20">
                                VIP Gold
                            </div>
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                                <NeoDialogTitle className="text-3xl font-black">{guest?.fullName}</NeoDialogTitle>
                                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 rounded-lg text-xs font-bold uppercase py-1">Em Casa</Badge>
                            </div>
                            <NeoDialogDescription className="text-base mt-2 flex items-center gap-4 flex-wrap">
                                <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {guest?.email || 'Sem e-mail'}</span>
                                <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {guest?.phone || 'Sem telefone'}</span>
                            </NeoDialogDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" className="rounded-xl h-11 border-border/60">Editar Perfil</Button>
                            <Button className="rounded-xl h-11 shadow-lg shadow-primary/20">Registrar Estadia</Button>
                        </div>
                    </div>
                </NeoDialogHeader>

                <NeoDialogBody className="space-y-8 pt-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Financial Snapshot */}
                        <NeoCard className="bg-secondary/20 border-border/40">
                            <NeoCardContent className="p-5">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Valor Vitalício (LTV)</h3>
                                <p className="text-3xl font-mono font-black text-emerald-500 leading-none">R$ 45.200</p>
                                <div className="mt-4 pt-4 border-t border-border/40 grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Resumo</p>
                                        <p className="text-sm font-bold">12 Estadias</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Ticket Médio</p>
                                        <p className="text-sm font-bold">R$ 3.766</p>
                                    </div>
                                </div>
                            </NeoCardContent>
                        </NeoCard>

                        {/* Current/Next Stay */}
                        <NeoCard className="md:col-span-2 border-primary/30 bg-primary/5 shadow-inner">
                            <NeoCardContent className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-primary">Estadia em Curso</h3>
                                    <Badge variant="outline" className="border-primary/20 text-primary font-bold">#882910</Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-8 items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="text-center">
                                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Entrada</p>
                                            <p className="text-lg font-black">22 Fev</p>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                        <div className="text-center">
                                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Saída</p>
                                            <p className="text-lg font-black">27 Fev</p>
                                        </div>
                                    </div>
                                    <div className="bg-background/60 p-3 rounded-xl border border-primary/20">
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Quarto</p>
                                        <div className="flex justify-between items-center">
                                            <p className="text-lg font-black">304</p>
                                            <span className="text-[10px] font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-lg uppercase">Sunset Suite</span>
                                        </div>
                                    </div>
                                </div>
                            </NeoCardContent>
                        </NeoCard>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Preferences */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                <Utensils className="w-4 h-4 text-amber-500" /> Preferências e Dieta
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {['Sem Glúten', 'Vegano', 'Alergia a Amendoim', 'Água com Gás'].map(tag => (
                                    <Badge key={tag} className="bg-rose-500/10 text-rose-500 border-rose-500/20 rounded-lg px-3 py-1 font-bold">{tag}</Badge>
                                ))}
                            </div>
                            <div className="space-y-4 pt-4 mt-4 border-t border-border/40">
                                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                    <Bed className="w-4 h-4 text-indigo-500" /> Preferências de Quarto
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {['Andar Alto', 'Travesseiro de Penas', 'Jornal Impresso', 'Sem Carpete'].map(tag => (
                                        <Badge key={tag} className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20 rounded-lg px-3 py-1 font-bold">{tag}</Badge>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Recent History */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                <History className="w-4 h-4 text-primary" /> Histórico Recente
                            </h3>
                            <div className="space-y-3">
                                {[1, 2].map(i => (
                                    <div key={i} className="group p-4 bg-secondary/20 rounded-2xl border border-border/40 hover:border-primary/40 transition-all">
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="text-xs font-bold">Outubro 2023</p>
                                            <div className="flex text-amber-500">
                                                {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-2.5 h-2.5 fill-current" />)}
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-relaxed italic line-clamp-2">
                                            "Hóspede esqueceu carregador e foi devolvido via Sedex. Excelente relacionamento."
                                        </p>
                                    </div>
                                ))}
                                <Button variant="ghost" className="w-full text-xs font-bold uppercase tracking-widest h-10 gap-2">
                                    Ver Histórico Completo <ArrowRight className="w-3 h-3" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </NeoDialogBody>

                <NeoDialogActions className="border-t border-border/40 pt-4">
                    <Button variant="ghost" onClick={onClose} className="rounded-xl h-12 px-8 font-bold text-muted-foreground uppercase text-[10px] tracking-widest">Fechar Janela</Button>
                </NeoDialogActions>
            </NeoDialogContent>
        </NeoDialog>
    );
}
