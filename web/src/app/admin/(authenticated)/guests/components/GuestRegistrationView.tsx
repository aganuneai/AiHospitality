'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    User,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Diamond,
    TrendingUp,
    History,
    ArrowLeft,
    Save,
    X,
    Loader2,
    ShieldCheck,
    Globe,
    Languages,
    Flag,
    Utensils,
    Bed,
    CreditCard,
    Crown,
    AlertCircle,
    Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { NeoCard, NeoCardContent } from '@/components/neo';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const validateCPF = (cpf: string) => {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

    let add = 0;
    for (let i = 0; i < 9; i++) add += parseInt(cpf.charAt(i)) * (10 - i);
    let rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(9))) return false;

    add = 0;
    for (let i = 0; i < 10; i++) add += parseInt(cpf.charAt(i)) * (11 - i);
    rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(10))) return false;

    return true;
};

const guestSchema = z.object({
    fullName: z.string().min(3, "Nome muito curto"),
    email: z.string().email("E-mail inválido").or(z.literal('')),
    phone: z.string().default(''),
    dateOfBirth: z.string().default(''),
    language: z.string().default('pt-BR'),
    nationality: z.string().default('Brasil'),
    marketCode: z.string().default(''),
    address: z.string().default(''),
    documentType: z.enum(['CPF', 'PASSPORT', 'RG', 'OTHER']).default('CPF'),
    documentNumber: z.string().min(1, "Documento é obrigatório"),
    active: z.boolean().default(true),
    doNotDisturb: z.boolean().default(false),
    noPost: z.boolean().default(false),
    preferences: z.object({
        room: z.array(z.string()).default([]),
        dietary: z.array(z.string()).default([]),
        housekeeping: z.array(z.string()).default([]),
    }).default({ room: [], dietary: [], housekeeping: [] }),
}).superRefine((data, ctx) => {
    if (data.nationality === 'Brasil' && data.documentType === 'CPF') {
        if (!validateCPF(data.documentNumber)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "CPF inválido (algoritmo falhou)",
                path: ["documentNumber"],
            });
        }
    }
});

type GuestFormValues = z.input<typeof guestSchema>;

// Auxiliar para máscara de CPF
const maskCPF = (value: string) => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
};

interface GuestRegistrationViewProps {
    guestId: string | null;
    onClose: () => void;
    onSuccess: () => void;
}

export function GuestRegistrationView({ guestId, onClose, onSuccess }: GuestRegistrationViewProps) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'details' | 'preferences' | 'history' | 'loyalty'>('details');

    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors }
    } = useForm<GuestFormValues>({
        resolver: zodResolver(guestSchema),
        defaultValues: {
            fullName: '',
            email: '',
            phone: '',
            dateOfBirth: '',
            language: 'pt-BR',
            nationality: 'Brasil',
            marketCode: '',
            address: '',
            documentType: 'CPF',
            documentNumber: '',
            active: true,
            doNotDisturb: false,
            noPost: false,
            preferences: { room: [], dietary: [], housekeeping: [] }
        }
    });

    useEffect(() => {
        if (guestId) {
            loadGuest();
        }
    }, [guestId]);

    const loadGuest = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/v1/admin/guests/${guestId}`, {
                headers: { 'x-hotel-id': 'HOTEL_001' }
            });
            const data = await response.json();

            reset({
                fullName: data.fullName,
                email: data.email || '',
                phone: data.phone || '',
                dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString().split('T')[0] : '',
                language: data.language || 'pt-BR',
                nationality: data.nationality || '',
                marketCode: data.marketCode || '',
                address: data.address || '',
                documentType: data.document?.type || '',
                documentNumber: data.document?.number || '',
                active: data.active ?? true,
                doNotDisturb: data.doNotDisturb ?? false,
                noPost: data.noPost ?? false,
                preferences: data.preferences || { room: [], dietary: [], housekeeping: [] },
            });
        } catch (error) {
            toast.error("Erro ao carregar hóspede");
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (values: GuestFormValues) => {
        setSaving(true);
        try {
            const method = guestId ? 'PUT' : 'POST';
            const url = guestId ? `/api/v1/admin/guests/${guestId}` : '/api/v1/admin/guests';

            const payload = {
                ...values,
                document: {
                    type: values.documentType,
                    number: values.documentNumber,
                    country: values.nationality
                },
                preferences: values.preferences
            };

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-hotel-id': 'HOTEL_001'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                toast.success(guestId ? "Perfil atualizado com sucesso" : "Hóspede cadastrado com sucesso");
                onSuccess();
                onClose();
            } else {
                throw new Error("Falha ao salvar");
            }
        } catch (error) {
            toast.error("Erro ao salvar informações");
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary/40" />
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Sincronizando Ecossistema CRM...</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-8 pb-12">
            {/* Action Bar */}
            <div className="flex items-center justify-between">
                <Button
                    variant="ghost"
                    onClick={onClose}
                    className="group flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Voltar para Lista</span>
                </Button>

                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={onClose} className="rounded-xl h-11 px-6 font-bold">Cancelar</Button>
                    <Button
                        onClick={handleSubmit(onSubmit) as any}
                        disabled={saving}
                        className="rounded-xl h-11 px-8 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20 bg-indigo-600 hover:bg-indigo-500"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Salvar Perfil
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Column 1: Profile Summary */}
                <div className="lg:col-span-1 space-y-6">
                    <NeoCard className="bg-secondary/20 border-border/40 overflow-hidden">
                        <NeoCardContent className="p-8 text-center flex flex-col items-center">
                            <div className="relative group/photo mb-6">
                                <div className="w-32 h-32 rounded-[2.5rem] bg-indigo-500/10 border-2 border-dashed border-indigo-500/30 flex items-center justify-center cursor-pointer hover:border-indigo-500 transition-all overflow-hidden">
                                    <User className="w-12 h-12 text-indigo-500/40" />
                                </div>
                                <div className="absolute top-0 right-0 p-2 bg-background rounded-full border border-border/40 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Globe className="w-3.5 h-3.5 text-primary" />
                                </div>
                            </div>

                            <h2 className="text-2xl font-black mb-1">{watch('fullName') || 'Novo Hóspede'}</h2>
                            <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 rounded-lg text-[10px] font-black uppercase tracking-tighter mb-8">
                                <Crown className="w-3 h-3 mr-1" /> Gold VIP
                            </Badge>

                            <div className="w-full space-y-3">
                                <div className="flex items-center gap-3 p-3 bg-background/40 rounded-xl border border-border/20 group/contact">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                        <Mail className="w-3.5 h-3.5 text-indigo-500" />
                                    </div>
                                    <p className="text-xs font-bold truncate flex-1 text-left">{watch('email') || 'Adicionar e-mail'}</p>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-background/40 rounded-xl border border-border/20">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                        <Phone className="w-3.5 h-3.5 text-emerald-500" />
                                    </div>
                                    <p className="text-xs font-bold truncate flex-1 text-left">{watch('phone') || 'Adicionar telefone'}</p>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-background/40 rounded-xl border border-border/20">
                                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                                    </div>
                                    <p className="text-[10px] font-bold leading-tight truncate flex-1 text-left">{watch('address') || 'Adicionar endereço'}</p>
                                </div>
                            </div>
                        </NeoCardContent>
                    </NeoCard>
                </div>

                {/* Column 2: Main Form */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Tab Navigation */}
                    <div className="bg-secondary/20 p-1 rounded-2xl border border-border/40 flex gap-1">
                        {[
                            { id: 'details', label: 'Detalhes', icon: User },
                            { id: 'preferences', label: 'Preferências', icon: Utensils },
                            { id: 'history', label: 'Histórico', icon: History },
                            { id: 'loyalty', label: 'Fidelidade', icon: Crown }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id as any)}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
                                    activeTab === tab.id
                                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 scale-105"
                                        : "text-muted-foreground hover:bg-background/40"
                                )}
                            >
                                <tab.icon className="w-3.5 h-3.5" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <NeoCard className="border-border/40 min-h-[500px]">
                        <NeoCardContent className="p-8">
                            <form className="space-y-8 animate-in fade-in duration-300">
                                {activeTab === 'details' && (
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nome Completo Premium</Label>
                                            <div className="relative">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                <Input {...register('fullName')} className="pl-12 h-14 bg-secondary/30 rounded-2xl font-bold" placeholder="Digite o nome completo" />
                                            </div>
                                            {errors.fullName && <p className="text-[10px] text-rose-500 font-bold">{errors.fullName.message}</p>}
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">E-mail Corporativo</Label>
                                                <div className="relative">
                                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                    <Input {...register('email')} className="pl-12 h-14 bg-secondary/30 rounded-2xl font-bold" placeholder="ana.exemplo@empresa.com" />
                                                </div>
                                                {errors.email && <p className="text-[10px] text-rose-500 font-bold">{errors.email.message}</p>}
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Whatsapp / Telefone</Label>
                                                <div className="relative">
                                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                    <Input {...register('phone')} className="pl-12 h-14 bg-secondary/30 rounded-2xl font-bold" placeholder="+55 (11) 99999-9999" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Endereço Residencial / Contexto</Label>
                                            <div className="relative">
                                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                <Input {...register('address')} className="pl-12 h-14 bg-secondary/30 rounded-2xl font-bold" placeholder="Rua, Número, Bairro, Cidade - UF" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6 pt-4 border-t border-border/40">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tipo de Documento</Label>
                                                <select
                                                    {...register('documentType')}
                                                    className="w-full h-14 bg-secondary/30 rounded-2xl font-bold px-4 border-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                                                >
                                                    <option value="CPF">CPF (Brasil)</option>
                                                    <option value="PASSPORT">Passaporte</option>
                                                    <option value="RG">RG</option>
                                                    <option value="OTHER">Outro</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Número do Documento</Label>
                                                <div className="relative">
                                                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                    <Input
                                                        {...register('documentNumber')}
                                                        onChange={(e) => {
                                                            if (watch('documentType') === 'CPF') {
                                                                e.target.value = maskCPF(e.target.value);
                                                            }
                                                            register('documentNumber').onChange(e);
                                                        }}
                                                        className="pl-12 h-14 bg-secondary/30 rounded-2xl font-bold"
                                                        placeholder={watch('documentType') === 'CPF' ? "000.000.000-00" : "Digite o documento"}
                                                    />
                                                </div>
                                                {errors.documentNumber && <p className="text-[10px] text-rose-500 font-bold">{errors.documentNumber.message}</p>}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Idioma / Locale</Label>
                                                <div className="relative">
                                                    <Languages className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                    <Input {...register('language')} className="pl-12 h-14 bg-secondary/30 rounded-2xl font-bold" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nacionalidade Regional</Label>
                                                <div className="relative">
                                                    <Flag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                    <Input {...register('nationality')} className="pl-12 h-14 bg-secondary/30 rounded-2xl font-bold" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Data de Nascimento</Label>
                                                <div className="relative">
                                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                    <Input type="date" {...register('dateOfBirth')} className="pl-12 h-14 bg-secondary/30 rounded-2xl font-bold" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Código de Mercado</Label>
                                                <Input {...register('marketCode')} placeholder="Selecionar Mercado" className="h-14 bg-secondary/30 rounded-2xl font-bold" />
                                            </div>
                                        </div>

                                        <div className="space-y-2 pt-4 border-t border-border/40">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Flags Operacionais e Segurança</Label>
                                            <div className="grid grid-cols-3 gap-4">
                                                {[
                                                    { id: 'active', label: 'Ativo', color: 'bg-emerald-500' },
                                                    { id: 'doNotDisturb', label: 'Não Perturbe', color: 'bg-amber-500' },
                                                    { id: 'noPost', label: 'No Post', color: 'bg-rose-500' }
                                                ].map((flag) => (
                                                    <div key={flag.id} className="p-4 bg-secondary/30 rounded-2xl flex items-center justify-between group">
                                                        <span className="text-[10px] font-black uppercase tracking-tighter">{flag.label}</span>
                                                        <Switch
                                                            //@ts-ignore
                                                            checked={watch(flag.id)}
                                                            //@ts-ignore
                                                            onCheckedChange={(v) => setValue(flag.id, v)}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'preferences' && (
                                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                        {/* Room Features */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Bed className="w-4 h-4 text-indigo-500" />
                                                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Preferências de Quarto</h3>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {['Andar Alto', 'Quarto Silencioso', 'Próximo ao Elevador', 'Longe do Elevador', 'Quarto Conectado', 'Varanda'].map((pref) => {
                                                    const current = watch('preferences.room') || [];
                                                    const isSelected = current.includes(pref);
                                                    return (
                                                        <button
                                                            key={pref}
                                                            type="button"
                                                            onClick={() => {
                                                                const next = isSelected
                                                                    ? current.filter((i: string) => i !== pref)
                                                                    : [...current, pref];
                                                                setValue('preferences.room', next);
                                                            }}
                                                            className={cn(
                                                                "px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-tight transition-all border",
                                                                isSelected
                                                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20 scale-105"
                                                                    : "bg-secondary/30 text-muted-foreground border-border/40 hover:bg-secondary/50"
                                                            )}
                                                        >
                                                            {pref}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Dietary Requirements */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Utensils className="w-4 h-4 text-rose-500" />
                                                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Restrições Alimentares</h3>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {['Sem Glúten', 'Vegano', 'Alérgico a Nozes', 'Sem Lactose', 'Halal', 'Kosher'].map((pref) => {
                                                    const current = watch('preferences.dietary') || [];
                                                    const isSelected = current.includes(pref);
                                                    return (
                                                        <button
                                                            key={pref}
                                                            type="button"
                                                            onClick={() => {
                                                                const next = isSelected
                                                                    ? current.filter((i: string) => i !== pref)
                                                                    : [...current, pref];
                                                                setValue('preferences.dietary', next);
                                                            }}
                                                            className={cn(
                                                                "px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-tight transition-all border",
                                                                isSelected
                                                                    ? "bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/20 scale-105"
                                                                    : "bg-secondary/30 text-muted-foreground border-border/40 hover:bg-secondary/50"
                                                            )}
                                                        >
                                                            {pref}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Housekeeping */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Governança / Housekeeping</h3>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {['Travesseiro Extra', 'Toalhas Extras', 'Serviço Diário', 'Turndown Service', 'Não Perturbe'].map((pref) => {
                                                    const current = watch('preferences.housekeeping') || [];
                                                    const isSelected = current.includes(pref);
                                                    return (
                                                        <button
                                                            key={pref}
                                                            type="button"
                                                            onClick={() => {
                                                                const next = isSelected
                                                                    ? current.filter((i: string) => i !== pref)
                                                                    : [...current, pref];
                                                                setValue('preferences.housekeeping', next);
                                                            }}
                                                            className={cn(
                                                                "px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-tight transition-all border",
                                                                isSelected
                                                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20 scale-105"
                                                                    : "bg-secondary/30 text-muted-foreground border-border/40 hover:bg-secondary/50"
                                                            )}
                                                        >
                                                            {pref}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'history' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Last Used Rates & Stays</h3>
                                            <Badge variant="outline" className="border-border/60 text-[8px] font-black uppercase">Latest 5 Records</Badge>
                                        </div>

                                        <div className="space-y-3">
                                            {[
                                                { date: 'Nov 12 - Nov 15, 2024', rate: 'R$ 850,00', type: 'BAR - Best Available Rate', status: 'COMPLETED', room: '104' },
                                                { date: 'Set 05 - Set 08, 2024', rate: 'R$ 720,00', type: 'EARLY BIRD - 15%', status: 'COMPLETED', room: '205' },
                                                { date: 'Jul 20 - Jul 22, 2024', rate: 'R$ 980,00', type: 'BAR - Best Available Rate', status: 'COMPLETED', room: '312' },
                                                { date: 'Mai 10 - Mai 12, 2024', rate: 'R$ 650,00', type: 'PROMO - MOTHER DAY', status: 'COMPLETED', room: '108' },
                                            ].map((stay, idx) => (
                                                <div key={idx} className="p-4 bg-secondary/20 rounded-2xl border border-border/40 hover:bg-secondary/40 transition-colors flex items-center justify-between group">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-background border border-border/40 flex items-center justify-center font-black text-[10px] text-muted-foreground">
                                                            {stay.room}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black">{stay.date}</p>
                                                            <p className="text-[10px] font-bold text-muted-foreground">{stay.type}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-black text-indigo-600">{stay.rate}</p>
                                                        <p className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter">{stay.status}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="pt-6 border-t border-border/40 flex justify-center">
                                            <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary">
                                                View Complete Folio History
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'loyalty' && (
                                    <div className="space-y-6">
                                        <div className="bg-gradient-to-br from-indigo-600/20 to-transparent p-8 rounded-3xl border border-indigo-500/20 relative overflow-hidden group">
                                            <Crown className="absolute -bottom-4 -right-4 w-32 h-32 text-indigo-500/5 group-hover:scale-110 transition-transform duration-700" />
                                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">Status do Programa de Fidelidade</p>
                                            <h3 className="text-4xl font-black italic tracking-tighter">GOLD ELITE</h3>
                                            <div className="mt-6 flex items-center gap-4">
                                                <div className="flex-1 h-3 bg-indigo-500/10 rounded-full overflow-hidden">
                                                    <div className="h-full bg-indigo-600 w-[65%] rounded-full shadow-[0_0_10px_rgba(79,70,229,0.5)]" />
                                                </div>
                                                <span className="text-[10px] font-black">2.450 / 4.000 PTS</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-6 bg-secondary/30 rounded-[2rem] border border-border/40">
                                                <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Total de Pontos</p>
                                                <h4 className="text-2xl font-black">45.200</h4>
                                            </div>
                                            <div className="p-6 bg-secondary/30 rounded-[2rem] border border-border/40">
                                                <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Valor Reembolsável</p>
                                                <h4 className="text-2xl font-black text-emerald-500">R$ 2.260</h4>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </form>
                        </NeoCardContent>
                    </NeoCard>
                </div>

                {/* Column 3: Insights & Intelligence */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Relationship Web (Mock) */}
                    <NeoCard className="bg-secondary/20 border-border/40 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
                        <NeoCardContent className="p-6">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-6">Rede de Relacionamentos</h3>
                            <div className="relative h-48 flex items-center justify-center">
                                <div className="absolute w-20 h-20 rounded-full bg-indigo-600/20 border-2 border-indigo-600 flex items-center justify-center shadow-[0_0_30px_rgba(79,70,229,0.3)] animate-pulse">
                                    <span className="text-[10px] font-black text-white text-center leading-none uppercase">{watch('fullName')?.split(' ').map(n => n[0]).join('') || 'NW'}</span>
                                </div>
                                <div className="absolute top-4 left-6 w-10 h-10 rounded-full bg-secondary/50 border border-border/40 flex items-center justify-center">
                                    <span className="text-[8px] font-bold">IBM</span>
                                </div>
                                <div className="absolute bottom-6 right-8 w-12 h-12 rounded-full bg-secondary/50 border border-border/40 flex items-center justify-center">
                                    <span className="text-[8px] font-bold">MARY</span>
                                </div>
                                {/* Connection Lines (CSS) */}
                                <div className="absolute top-1/2 left-1/2 w-20 h-[2px] bg-indigo-500/20 -translate-x-[70%] -translate-y-[40%] rotate-[45deg]" />
                                <div className="absolute top-1/2 left-1/2 w-24 h-[2px] bg-indigo-500/20 -translate-x-[10%] translate-y-[80%] -rotate-[30deg]" />
                            </div>
                        </NeoCardContent>
                    </NeoCard>

                    {/* AI LTV Widget */}
                    <NeoCard className="bg-secondary/40 border-border/60">
                        <NeoCardContent className="p-6">
                            <div className="flex justify-between items-start mb-6">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">AI Lifetime Value (LTV)</h3>
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                                </div>
                            </div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Gasto Previsto</p>
                            <h4 className="text-4xl font-black text-indigo-600 italic tracking-tighter">R$ 52.400</h4>
                            <div className="mt-6 flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[8px] font-black text-muted-foreground uppercase">Risco de Churn</p>
                                    <Badge className="bg-emerald-500/10 text-emerald-500 h-5 text-[8px] font-black px-2 py-0 border-emerald-500/20">BAIXO</Badge>
                                </div>
                                <div className="text-right space-y-1">
                                    <p className="text-[8px] font-black text-muted-foreground uppercase">Proclividade</p>
                                    <p className="text-xs font-black">ALTA</p>
                                </div>
                            </div>
                        </NeoCardContent>
                    </NeoCard>

                    {/* Stay History Summary */}
                    <NeoCard className="border-border/40 bg-background/50">
                        <NeoCardContent className="p-6">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-6">Resumo de Estadias</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center">
                                    <p className="text-[2rem] font-black leading-none mb-1">12</p>
                                    <p className="text-[8px] font-black text-muted-foreground uppercase">Total Estadias</p>
                                </div>
                                <div className="text-center pt-2">
                                    <p className="text-sm font-black mb-1">12 Nov, 2024</p>
                                    <p className="text-[8px] font-black text-muted-foreground uppercase">Última Estadia</p>
                                </div>
                            </div>
                        </NeoCardContent>
                    </NeoCard>
                </div>
            </div>
        </div>
    );
}
