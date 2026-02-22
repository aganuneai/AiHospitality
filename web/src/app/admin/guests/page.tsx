'use client';

import { useState, useEffect } from 'react';
import {
    Users,
    Search,
    Mail,
    Phone,
    FileText,
    Edit2,
    RefreshCw,
    UserPlus
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
import { GuestEditSheet } from './components/GuestEditSheet';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function GuestsPage() {
    const [guests, setGuests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [sheetMode, setSheetMode] = useState<'create' | 'edit'>('edit');

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

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Hóspedes</h1>
                    <p className="text-muted-foreground mt-1">
                        Gerencie perfis de clientes, histórico e preferências.
                    </p>
                </div>
                <Button className="gap-2" onClick={() => {
                    setSheetMode('create');
                    setSelectedGuestId(null);
                    setIsEditOpen(true);
                }}>
                    <UserPlus className="h-4 w-4" />
                    Novo Hóspede
                </Button>
            </div>

            <Card className="border-border/60 shadow-sm bg-secondary/5">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-4">
                        <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nome, e-mail ou documento..."
                                className="pl-10 bg-background"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </form>
                        <Button variant="outline" size="icon" onClick={() => loadGuests()} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-border/40 bg-background overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead className="w-[300px]">Nome</TableHead>
                                    <TableHead>Contato</TableHead>
                                    <TableHead>Documento</TableHead>
                                    <TableHead>Última Ativação</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading && guests.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-48 text-center bg-muted/5">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                                                <span className="text-sm font-medium text-muted-foreground">Carregando hóspedes...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : guests.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-48 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Users className="h-8 w-8 text-muted-foreground/40" />
                                                <p className="text-muted-foreground font-medium">Nenhum hóspede encontrado</p>
                                                <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(''); loadGuests(); }}>Limpar busca</Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    guests.map((guest) => (
                                        <TableRow key={guest.id} className="group hover:bg-muted/30 transition-colors">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                        {guest.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-sm leading-none">{guest.fullName}</p>
                                                        <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-bold">ID: {guest.id.split('-')[0]}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <Mail className="h-3 w-3" />
                                                        {guest.email || <span className="italic opacity-50">Não informado</span>}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <Phone className="h-3 w-3" />
                                                        {guest.phone || <span className="italic opacity-50">Não informado</span>}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <Badge variant="outline" className="w-fit text-[10px] py-0 h-4 border-primary/20 bg-primary/5 text-primary">
                                                        {guest.documentType || 'DOC'}
                                                    </Badge>
                                                    <p className="text-xs font-medium">{guest.documentId || '-'}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <p className="text-xs text-muted-foreground">
                                                    {guest.updatedAt ? format(new Date(guest.updatedAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '-'}
                                                </p>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => {
                                                        setSheetMode('edit');
                                                        setSelectedGuestId(guest.id);
                                                        setIsEditOpen(true);
                                                    }}
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <GuestEditSheet
                guestId={selectedGuestId}
                isOpen={isEditOpen}
                onClose={() => {
                    setIsEditOpen(false);
                    setSelectedGuestId(null);
                }}
                onSuccess={() => loadGuests(searchTerm)}
                mode={sheetMode}
            />
        </div>
    );
}
