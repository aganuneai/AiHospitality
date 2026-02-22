'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const guestSchema = z.object({
    fullName: z.string().min(3, "Nome muito curto"),
    email: z.string().email("E-mail inválido").or(z.literal('')),
    phone: z.string().optional(),
    documentType: z.string().optional(),
    documentNumber: z.string().optional(),
});

type GuestFormValues = z.infer<typeof guestSchema>;

interface GuestEditSheetProps {
    guestId: string | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    mode: 'create' | 'edit';
}

export function GuestEditSheet({ guestId, isOpen, onClose, onSuccess, mode }: GuestEditSheetProps) {
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
        <Sheet open={isOpen} onOpenChange={(v) => !v && onClose()}>
            <SheetContent className="sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>{mode === 'create' ? 'Novo Hóspede' : 'Editar Perfil do Hóspede'}</SheetTitle>
                    <SheetDescription>
                        {mode === 'create'
                            ? 'Complete as informações básicas para cadastrar um novo cliente.'
                            : 'Atualize as informações de contato e documentos do cliente.'}
                    </SheetDescription>
                </SheetHeader>

                {loading ? (
                    <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="fullName">Nome Completo</Label>
                            <Input id="fullName" {...register('fullName')} />
                            {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">E-mail</Label>
                            <Input id="email" type="email" {...register('email')} />
                            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Telefone</Label>
                            <Input id="phone" {...register('phone')} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="documentType">Tipo Doc.</Label>
                                <Input id="documentType" {...register('documentType')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="documentNumber">Número</Label>
                                <Input id="documentNumber" {...register('documentNumber')} />
                            </div>
                        </div>

                        <SheetFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                            <Button type="submit" disabled={saving}>
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {mode === 'create' ? 'Cadastrar Hóspede' : 'Salvar Alterações'}
                            </Button>
                        </SheetFooter>
                    </form>
                )}
            </SheetContent>
        </Sheet>
    );
}
