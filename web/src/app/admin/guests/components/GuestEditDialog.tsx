'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { NeoDialog, NeoDialogContent, NeoDialogHeader, NeoDialogTitle, NeoDialogDescription, NeoDialogBody, NeoDialogActions } from "@/components/neo/neo-dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, X, Check } from 'lucide-react';

const guestSchema = z.object({
    fullName: z.string().min(3, "Nome muito curto"),
    email: z.string().email("E-mail inválido").or(z.literal('')),
    phone: z.string().optional(),
    documentType: z.string().optional(),
    documentNumber: z.string().optional(),
});

type GuestFormValues = z.infer<typeof guestSchema>;

interface GuestEditDialogProps {
    guestId: string | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    mode: 'create' | 'edit';
}

export function GuestEditDialog({ guestId, isOpen, onClose, onSuccess, mode }: GuestEditDialogProps) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const { register, handleSubmit, reset, formState: { errors } } = useForm<GuestFormValues>({
        resolver: zodResolver(guestSchema),
        defaultValues: {
            fullName: '',
            email: '',
            phone: '',
            documentType: 'passport',
            documentNumber: '',
        }
    });

    useEffect(() => {
        if (isOpen) {
            if (mode === 'edit' && guestId) {
                loadGuest();
            } else {
                reset({
                    fullName: '',
                    email: '',
                    phone: '',
                    documentType: 'passport',
                    documentNumber: '',
                });
            }
        }
    }, [guestId, isOpen, mode]);

    async function loadGuest() {
        setLoading(true);
        try {
            const response = await fetch(`/api/v1/admin/guests/${guestId}`, {
                headers: { 'x-hotel-id': 'HOTEL_001' }
            });
            if (!response.ok) throw new Error('Falha ao carregar hóspede');
            const data = await response.json();

            const doc = data.document || {};
            reset({
                fullName: data.fullName,
                email: data.email || '',
                phone: data.phone || '',
                documentType: doc.type || 'passport',
                documentNumber: doc.number || '',
            });
        } catch (error) {
            toast.error("Erro ao carregar dados do hóspede");
            onClose();
        } finally {
            setLoading(false);
        }
    }

    async function onSubmit(values: GuestFormValues) {
        setSaving(true);
        try {
            const payload = {
                fullName: values.fullName,
                email: values.email || null,
                phone: values.phone || null,
                document: {
                    type: values.documentType,
                    number: values.documentNumber
                }
            };

            const url = mode === 'edit'
                ? `/api/v1/admin/guests/${guestId}`
                : `/api/v1/admin/guests`;

            const method = mode === 'edit' ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-hotel-id': 'HOTEL_001'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Falha ao salvar');

            toast.success(mode === 'edit' ? "Perfil atualizado com sucesso" : "Hóspede criado com sucesso");
            onSuccess();
            onClose();
        } catch (error) {
            toast.error("Erro ao salvar alterações");
        } finally {
            setSaving(false);
        }
    }

    return (
        <NeoDialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
            <NeoDialogContent className="sm:max-w-md">
                <NeoDialogHeader>
                    <NeoDialogTitle>{mode === 'create' ? 'Novo Hóspede' : 'Editar Perfil do Hóspede'}</NeoDialogTitle>
                    <NeoDialogDescription>
                        {mode === 'create'
                            ? 'Complete as informações básicas para cadastrar um novo cliente.'
                            : 'Atualize as informações de contato e documentos do cliente.'}
                    </NeoDialogDescription>
                </NeoDialogHeader>

                <NeoDialogBody>
                    {loading ? (
                        <div className="flex items-center justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <form id="guest-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="fullName" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome Completo *</Label>
                                <Input id="fullName" {...register('fullName')} className="bg-secondary/30" />
                                {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">E-mail</Label>
                                <Input id="email" type="email" {...register('email')} className="bg-secondary/30" />
                                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Telefone</Label>
                                <Input id="phone" {...register('phone')} className="bg-secondary/30" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="documentType" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipo Doc.</Label>
                                    <Input id="documentType" {...register('documentType')} className="bg-secondary/30" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="documentNumber" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Número</Label>
                                    <Input id="documentNumber" {...register('documentNumber')} className="bg-secondary/30" />
                                </div>
                            </div>
                        </form>
                    )}
                </NeoDialogBody>

                <NeoDialogActions>
                    <Button type="button" variant="ghost" onClick={onClose} className="rounded-lg">
                        <X className="mr-2 h-4 w-4" />Cancelar
                    </Button>
                    <Button type="submit" form="guest-form" disabled={saving || loading} className="rounded-lg px-8">
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                        {mode === 'create' ? 'Cadastrar Hóspede' : 'Salvar Alterações'}
                    </Button>
                </NeoDialogActions>
            </NeoDialogContent>
        </NeoDialog>
    );
}
