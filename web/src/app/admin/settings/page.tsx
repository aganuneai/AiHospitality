"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Building2,
    Gavel,
    CreditCard,
    Mail,
    Phone,
    MapPin,
    BadgeCheck,
    Globe,
    Save,
    CheckCircle2,
    ShieldCheck,
    Plus,
    Trash2,
    QrCode,
    Smartphone,
    Wallet,
    Info,
    ChevronRight,
    ArrowRight,
    Settings
} from "lucide-react"
import {
    NeoCard,
    NeoCardContent,
    NeoCardHeader,
    NeoCardTitle,
    NeoCardDescription,
    NeoButton,
    NeoInput,
    NeoToaster
} from "@/components/neo"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type Tab = "general" | "policies" | "payment"

export default function SettingsPage() {
    const fileInputRef = React.useRef<HTMLInputElement>(null)
    const [activeTab, setActiveTab] = useState<Tab>("general")
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Form State
    const [settings, setSettings] = useState<any>({
        name: "",
        email: "",
        phone: "",
        address: "",
        description: "",
        metadata: {
            policies: {
                cancellation: {
                    deadlineValue: 48,
                    deadlineUnit: "hours",
                    penaltyValue: 100,
                    penaltyType: "night"
                }
            },
            financial: {
                currency: "BRL",
                taxRate: 12,
                paymentMethods: {
                    creditCard: true,
                    debitCard: true,
                    cash: true,
                    pix: true,
                    bankTransfer: false
                }
            }
        }
    })

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        try {
            const res = await fetch("/api/v1/admin/settings")
            if (res.ok) {
                const data = await res.json()
                setSettings({
                    ...data,
                    metadata: {
                        ...settings.metadata,
                        ...data.metadata
                    }
                })
            }
        } catch (error) {
            toast.error("Erro ao carregar configurações")
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const res = await fetch("/api/v1/admin/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings)
            })
            if (res.ok) {
                toast.success("Configurações salvas com sucesso!")
            } else {
                toast.error("Erro ao salvar configurações")
            }
        } catch (error) {
            toast.error("Erro ao conectar com o servidor")
        } finally {
            setSaving(false)
        }
    }

    const updateNestedMetadata = (path: string, value: any) => {
        const newSettings = { ...settings }
        const parts = path.split(".")
        let current = newSettings.metadata

        for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) current[parts[i]] = {}
            current = current[parts[i]]
        }
        current[parts[parts.length - 1]] = value
        setSettings(newSettings)
    }

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                toast.error("Logo muito grande. Máximo 2MB.")
                return
            }

            const reader = new FileReader()
            reader.onload = (event) => {
                const base64 = event.target?.result as string
                setSettings({
                    ...settings,
                    metadata: {
                        ...settings.metadata,
                        logo: base64
                    }
                })
                toast.success("Logo carregada com sucesso!")
            }
            reader.readAsDataURL(file)
        }
    }

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-sm font-medium text-muted-foreground">Carregando preferências...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
            {/* Header */}
            <header className="h-20 px-8 border-b border-border/40 flex items-center justify-between bg-card/50 backdrop-blur-xl z-20 sticky top-0">
                <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
                        <Settings className="text-primary-foreground w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight font-heading">Ajustes Globais</h1>
                        <p className="text-sm text-muted-foreground font-medium">Preferências e regras do sistema</p>
                    </div>
                </div>

                <NeoButton
                    size="lg"
                    className="h-11 px-6 gap-2 shadow-lg shadow-primary/20"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <div className="w-4 h-4 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" />
                    ) : (
                        <Save className="w-4 h-4" />
                    )}
                    {saving ? "Salvando..." : "Salvar Alterações"}
                </NeoButton>
            </header>

            {/* Navigation Tabs */}
            <div className="px-8 pt-6 pb-0 border-b border-border/40 bg-card/30">
                <div className="flex gap-8">
                    {[
                        { id: "general", label: "Identidade", icon: Building2 },
                        { id: "policies", label: "Políticas", icon: Gavel },
                        { id: "payment", label: "Financeiro", icon: CreditCard },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as Tab)}
                            className={cn(
                                "pb-4 px-1 flex items-center gap-2.5 text-sm font-bold transition-all relative group",
                                activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <tab.icon className={cn("w-4 h-4 transition-colors", activeTab === tab.id ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                            {tab.label}
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="activeTabUnderline"
                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                                />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Scrollable Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                <div className="max-w-6xl mx-auto space-y-8 pb-12">
                    <AnimatePresence mode="wait">
                        {/* GENERAL TAB */}
                        {activeTab === "general" && (
                            <motion.div
                                key="general"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                            >
                                <div className="lg:col-span-2 space-y-8">
                                    <NeoCard className="shadow-sm border-border/50 overflow-hidden">
                                        <NeoCardHeader className="bg-secondary/20 border-b border-border/40">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                                    <BadgeCheck className="w-5 h-5" />
                                                </div>
                                                <NeoCardTitle className="text-lg">Identidade do Hotel</NeoCardTitle>
                                            </div>
                                        </NeoCardHeader>
                                        <NeoCardContent className="p-8 space-y-6">
                                            <div className="flex flex-col md:flex-row gap-8 items-start">
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={handleLogoUpload}
                                                />
                                                <div
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="w-28 h-28 rounded-2xl bg-secondary/30 border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 shrink-0 group cursor-pointer hover:border-primary/50 transition-all hover:bg-primary/5 relative overflow-hidden"
                                                >
                                                    {settings.metadata.logo ? (
                                                        <>
                                                            <img
                                                                src={settings.metadata.logo}
                                                                alt="Logo"
                                                                className="w-full h-full object-cover"
                                                            />
                                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <span className="text-[10px] font-bold text-white uppercase tracking-wider">Trocar</span>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider group-hover:text-primary transition-colors">Logo</span>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="flex-1 w-full space-y-4">
                                                    <div className="space-y-1.5">
                                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Nome Comercial</label>
                                                        <NeoInput
                                                            placeholder="Ex: Aura Boutique Hotel"
                                                            value={settings.name}
                                                            onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                                                            className="h-11 font-medium bg-background/50 focus:bg-background transition-all"
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Descrição Curta</label>
                                                        <textarea
                                                            placeholder="Uma breve apresentação do seu hotel para os hóspedes..."
                                                            rows={3}
                                                            className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-accent-foreground/20 resize-none"
                                                            value={settings.description || ""}
                                                            onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </NeoCardContent>
                                    </NeoCard>

                                    <NeoCard className="shadow-sm border-border/50 overflow-hidden">
                                        <NeoCardHeader className="bg-secondary/20 border-b border-border/40">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                                                    <MapPin className="w-5 h-5" />
                                                </div>
                                                <NeoCardTitle className="text-lg">Localização e Contato</NeoCardTitle>
                                            </div>
                                        </NeoCardHeader>
                                        <NeoCardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="md:col-span-2 space-y-1.5">
                                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Endereço Completo</label>
                                                <div className="relative">
                                                    <MapPin className="absolute left-3.5 top-3 w-4.5 h-4.5 text-muted-foreground" />
                                                    <NeoInput
                                                        className="pl-11 h-11 transition-all"
                                                        value={settings.address || ""}
                                                        onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                                                        placeholder="Rua, Número, Bairro, Cidade - UF"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">E-mail Reservas</label>
                                                <div className="relative">
                                                    <Mail className="absolute left-3.5 top-3 w-4.5 h-4.5 text-muted-foreground" />
                                                    <NeoInput
                                                        type="email"
                                                        className="pl-11 h-11 transition-all"
                                                        value={settings.email || ""}
                                                        onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                                                        placeholder="contato@hotel.com"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Telefone / WhatsApp</label>
                                                <div className="relative">
                                                    <Phone className="absolute left-3.5 top-3 w-4.5 h-4.5 text-muted-foreground" />
                                                    <NeoInput
                                                        className="pl-11 h-11 transition-all"
                                                        value={settings.phone || ""}
                                                        onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                                                        placeholder="+55 (00) 00000-0000"
                                                    />
                                                </div>
                                            </div>
                                        </NeoCardContent>
                                    </NeoCard>
                                </div>

                                {/* Preview Sidebar */}
                                <div className="space-y-6">
                                    <div className="bg-card rounded-3xl p-6 border border-border/60 sticky top-8 shadow-xl shadow-primary/5">
                                        <h3 className="text-xs font-bold text-muted-foreground mb-6 uppercase tracking-[0.2em] relative flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                            Visualização Prévia
                                        </h3>
                                        <div className="rounded-2xl overflow-hidden border border-border/40 shadow-2xl bg-background group">
                                            <div className="h-32 bg-gradient-to-br from-primary via-primary/80 to-accent animate-gradient relative overflow-hidden">
                                                <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />
                                                {settings.metadata.logo && (
                                                    <div className="absolute top-4 right-4 w-12 h-12 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 p-1.5 overflow-hidden">
                                                        <img
                                                            src={settings.metadata.logo}
                                                            alt="Hotel Logo"
                                                            className="w-full h-full object-contain filter brightness-110 drop-shadow-md"
                                                        />
                                                    </div>
                                                )}
                                                <div className="absolute bottom-4 left-4 right-4 text-white">
                                                    <h4 className="text-lg font-bold tracking-tight mb-0.5 drop-shadow-sm truncate">{settings.name || "Seu Hotel"}</h4>
                                                    <div className="flex items-center gap-1.5 text-[10px] font-medium opacity-90 drop-shadow-sm">
                                                        <MapPin className="w-2.5 h-2.5" />
                                                        <span className="truncate">{settings.address ? settings.address.split(',')[0] : "Cidade, Estado"}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-5 space-y-4">
                                                <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground/80">
                                                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                                        <Mail className="w-3.5 h-3.5" />
                                                    </div>
                                                    <span className="truncate">{settings.email || "contato@hotel.com"}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground/80">
                                                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                                                        <Phone className="w-3.5 h-3.5" />
                                                    </div>
                                                    <span>{settings.phone || "+55 11 99999-9999"}</span>
                                                </div>
                                                <p className="text-[11px] leading-relaxed text-muted-foreground/60 line-clamp-3 italic">
                                                    "{settings.description || "Adicione uma descrição charmosa para atrair hóspedes."}"
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-8 p-4 rounded-xl bg-primary/5 border border-primary/10 flex gap-3 items-start">
                                            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                            <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                                                Estes dados serão exibidos em vouchers, confirmações de reserva e no seu site direto.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* POLICIES TAB */}
                        {activeTab === "policies" && (
                            <motion.div
                                key="policies"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                            >
                                <div className="lg:col-span-2 space-y-8">
                                    <NeoCard className="shadow-sm border-border/50 overflow-hidden">
                                        <NeoCardHeader className="bg-secondary/20 border-b border-border/40">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                                    <ShieldCheck className="w-5 h-5" />
                                                </div>
                                                <NeoCardTitle className="text-lg">Políticas de Cancelamento</NeoCardTitle>
                                            </div>
                                        </NeoCardHeader>
                                        <NeoCardContent className="p-8 space-y-12">
                                            {/* Rule Builder */}
                                            <div className="space-y-10 relative">
                                                <div className="text-base md:text-xl font-medium leading-loose text-foreground/80 tracking-tight">
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-4">
                                                        <span>Hóspedes podem cancelar</span>
                                                        <span className="bg-emerald-500/20 text-emerald-600 px-3 py-1 rounded-lg font-bold border border-emerald-500/20">Grátis</span>
                                                        <span>até</span>
                                                        <div className="flex items-center gap-2 group">
                                                            <input
                                                                type="number"
                                                                className="w-16 h-10 bg-secondary/40 border border-border rounded-lg text-center font-bold text-primary focus:border-primary outline-none transition-all"
                                                                value={settings.metadata.policies.cancellation.deadlineValue}
                                                                onChange={(e) => updateNestedMetadata("policies.cancellation.deadlineValue", Number(e.target.value))}
                                                            />
                                                            <select
                                                                className="h-10 bg-secondary/40 border border-border rounded-lg px-3 font-bold text-primary focus:border-primary outline-none cursor-pointer"
                                                                value={settings.metadata.policies.cancellation.deadlineUnit}
                                                                onChange={(e) => updateNestedMetadata("policies.cancellation.deadlineUnit", e.target.value)}
                                                            >
                                                                <option value="hours">Horas</option>
                                                                <option value="days">Dias</option>
                                                            </select>
                                                        </div>
                                                        <span>antes do check-in.</span>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-4 mt-6">
                                                        <span>Após este prazo, será cobrada multa de</span>
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="number"
                                                                className="w-16 h-10 bg-red-500/5 border border-red-500/20 rounded-lg text-center font-bold text-red-500 focus:border-red-500 outline-none transition-all"
                                                                value={settings.metadata.policies.cancellation.penaltyValue}
                                                                onChange={(e) => updateNestedMetadata("policies.cancellation.penaltyValue", Number(e.target.value))}
                                                            />
                                                            <span className="text-sm font-bold text-red-500/60">%</span>
                                                        </div>
                                                        <span>sobre o valor da</span>
                                                        <select
                                                            className="h-10 bg-red-500/5 border border-red-500/20 rounded-lg px-3 font-bold text-red-500 focus:border-red-500 outline-none cursor-pointer"
                                                            value={settings.metadata.policies.cancellation.penaltyType}
                                                            onChange={(e) => updateNestedMetadata("policies.cancellation.penaltyType", e.target.value)}
                                                        >
                                                            <option value="night">Primeira Noite</option>
                                                            <option value="percent">Tota da Reserva</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* Visual Timeline */}
                                                <div className="pt-10 border-t border-border/40">
                                                    <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 italic">
                                                        <span>Reserva Confirmada</span>
                                                        <span className="text-foreground">Check-in (Entrada)</span>
                                                    </div>
                                                    <div className="h-5 bg-secondary/30 rounded-full relative overflow-hidden flex shadow-inner border border-border/20">
                                                        <motion.div
                                                            className="h-full bg-gradient-to-r from-emerald-500/40 via-emerald-500 to-emerald-400 border-r-2 border-white/20"
                                                            animate={{ width: settings.metadata.policies.cancellation.deadlineValue === 0 ? "0%" : "65%" }}
                                                            transition={{ type: "spring", stiffness: 50 }}
                                                        />
                                                        <div className="flex-1 bg-gradient-to-r from-red-500 to-red-600/60" />

                                                        {/* Deadline Marker */}
                                                        {settings.metadata.policies.cancellation.deadlineValue > 0 && (
                                                            <div className="absolute top-0 bottom-0 left-[65%] flex flex-col items-center z-10 translate-x-[-50%]">
                                                                <div className="h-full w-0.5 bg-white drop-shadow-md" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex justify-between mt-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                            <span className="text-xs font-bold text-emerald-600 tracking-tight">Janela de Cancelamento Grátis</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-bold text-red-600 tracking-tight">Janela de Multa Ativa</span>
                                                            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </NeoCardContent>
                                    </NeoCard>
                                </div>

                                <div className="space-y-6">
                                    <div className="bg-card rounded-3xl p-6 border border-border/60 shadow-xl shadow-primary/5">
                                        <h3 className="text-xs font-bold text-muted-foreground mb-6 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <BadgeCheck className="w-4 h-4 text-blue-500" />
                                            Regras Ativas
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                                                <div className="text-xs font-bold text-emerald-700 uppercase mb-1">Cenário Favorável</div>
                                                <div className="text-sm font-medium text-emerald-600 leading-snug">
                                                    Cancelando antes de {settings.metadata.policies.cancellation.deadlineValue} {settings.metadata.policies.cancellation.deadlineUnit === "hours" ? "horas" : "dias"}:
                                                </div>
                                                <div className="mt-2 text-xl font-bold text-emerald-950 font-heading">Reembolso 100%</div>
                                            </div>
                                            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                                                <div className="text-xs font-bold text-red-700 uppercase mb-1">Cenário Crítico</div>
                                                <div className="text-sm font-medium text-red-600 leading-snug">
                                                    Cancelando após o prazo limite ou No-Show:
                                                </div>
                                                <div className="mt-2 text-xl font-bold text-red-950 font-heading">Retenção de {settings.metadata.policies.cancellation.penaltyValue}%</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* PAYMENT TAB */}
                        {activeTab === "payment" && (
                            <motion.div
                                key="payment"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                            >
                                <div className="lg:col-span-2 space-y-8">
                                    <NeoCard className="shadow-sm border-border/50 overflow-hidden">
                                        <NeoCardHeader className="bg-secondary/20 border-b border-border/40">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                                                    <BadgeDollarSign className="w-5 h-5" />
                                                </div>
                                                <NeoCardTitle className="text-lg">Configurações Financeiras</NeoCardTitle>
                                            </div>
                                        </NeoCardHeader>
                                        <NeoCardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Moeda do Sistema</label>
                                                <select
                                                    className="w-full h-12 bg-background border border-border rounded-xl px-4 font-bold text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none cursor-pointer hover:border-primary/50"
                                                    value={settings.metadata.financial.currency}
                                                    onChange={(e) => updateNestedMetadata("financial.currency", e.target.value)}
                                                >
                                                    <option value="BRL">Real Brasileiro (R$)</option>
                                                    <option value="USD">Dólar Americano (US$)</option>
                                                    <option value="EUR">Euro (€)</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Taxa de Serviço Default (%)</label>
                                                <div className="relative">
                                                    <NeoInput
                                                        type="number"
                                                        className="h-12 font-bold transition-all pr-12"
                                                        value={settings.metadata.financial.taxRate}
                                                        onChange={(e) => updateNestedMetadata("financial.taxRate", Number(e.target.value))}
                                                    />
                                                    <span className="absolute right-4 top-3.5 font-bold text-muted-foreground">%</span>
                                                </div>
                                            </div>
                                        </NeoCardContent>
                                    </NeoCard>

                                    <NeoCard className="shadow-sm border-border/50 overflow-hidden">
                                        <NeoCardHeader className="bg-secondary/20 border-b border-border/40">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                                    <CreditCard className="w-5 h-5" />
                                                </div>
                                                <NeoCardTitle className="text-lg">Métodos de Pagamento Aceitos</NeoCardTitle>
                                            </div>
                                        </NeoCardHeader>
                                        <NeoCardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {[
                                                { id: "creditCard", label: "Cartão de Crédito", icon: CreditCard },
                                                { id: "debitCard", label: "Cartão de Débito", icon: Wallet },
                                                { id: "cash", label: "Dinheiro (Espécie)", icon: BadgeDollarSign },
                                                { id: "pix", label: "Pix (Imediato)", icon: QrCode },
                                                { id: "bankTransfer", label: "Transferência Bancária", icon: Building2 },
                                            ].map((method) => (
                                                <div
                                                    key={method.id}
                                                    onClick={() => {
                                                        const current = settings.metadata.financial.paymentMethods
                                                        updateNestedMetadata(`financial.paymentMethods.${method.id}`, !current[method.id])
                                                    }}
                                                    className={cn(
                                                        "p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 flex items-center justify-between group overflow-hidden relative",
                                                        settings.metadata.financial.paymentMethods[method.id]
                                                            ? "bg-primary/5 border-primary shadow-lg shadow-primary/5"
                                                            : "bg-background border-border hover:border-border-muted"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-4 relative z-10">
                                                        <div className={cn(
                                                            "p-2.5 rounded-xl transition-all duration-300",
                                                            settings.metadata.financial.paymentMethods[method.id]
                                                                ? "bg-primary text-primary-foreground scale-110 shadow-md"
                                                                : "bg-secondary text-muted-foreground group-hover:text-primary group-hover:bg-primary/10"
                                                        )}>
                                                            <method.icon className="w-5 h-5" />
                                                        </div>
                                                        <span className={cn(
                                                            "font-bold tracking-tight text-sm transition-colors",
                                                            settings.metadata.financial.paymentMethods[method.id] ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                                                        )}>
                                                            {method.label}
                                                        </span>
                                                    </div>

                                                    <div className={cn(
                                                        "w-10 h-10 flex items-center justify-center rounded-full transition-all duration-500",
                                                        settings.metadata.financial.paymentMethods[method.id]
                                                            ? "bg-primary/10 text-primary scale-100 opacity-100 rotate-0"
                                                            : "scale-50 opacity-0 rotate-180"
                                                    )}>
                                                        <CheckCircle2 className="w-6 h-6" />
                                                    </div>

                                                    {/* Background Accent */}
                                                    <div className={cn(
                                                        "absolute -right-4 -bottom-4 w-24 h-24 bg-primary/5 rounded-full transition-all duration-500",
                                                        settings.metadata.financial.paymentMethods[method.id] ? "scale-100 opacity-100" : "scale-0 opacity-0"
                                                    )} />
                                                </div>
                                            ))}
                                        </NeoCardContent>
                                    </NeoCard>
                                </div>

                                <div className="space-y-6">
                                    <div className="bg-gradient-to-br from-card to-card/50 rounded-3xl p-6 border border-border/60 shadow-xl shadow-primary/5">
                                        <h3 className="text-xs font-bold text-muted-foreground mb-6 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <ShieldCheck className="w-4 h-4 text-primary" />
                                            Segurança & Gateway
                                        </h3>
                                        <div className="p-6 rounded-2xl bg-background border border-border/60 border-t-4 border-t-primary shadow-sm relative overflow-hidden">
                                            <div className="flex items-center gap-4 relative z-10">
                                                <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg">
                                                    <span className="text-white font-black italic text-xl">S</span>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-foreground">Stripe Gateway</h4>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Conectado</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button className="w-full mt-6 py-2.5 bg-secondary hover:bg-secondary/70 text-secondary-foreground text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2">
                                                Gerenciar Conta
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        <div className="mt-4 p-6 rounded-2xl bg-secondary/10 border border-dashed border-border flex flex-col items-center justify-center text-center group cursor-pointer hover:border-primary/40 hover:bg-secondary/20 transition-all">
                                            <Plus className="w-8 h-8 text-muted-foreground/40 group-hover:text-primary transition-colors mb-3" />
                                            <span className="text-xs font-bold text-muted-foreground/60 group-hover:text-primary transition-colors">Conectar outro processador</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
            <NeoToaster />
        </div>
    )
}

function BadgeDollarSign(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L6 14" />
            <path d="m20 17-5-5 5-5" />
            <path d="M6 3v18" />
            <path d="m14 17 5-5-5-5" />
        </svg>
    )
}
