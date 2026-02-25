"use client"

import { useState, useEffect } from "react"
import { NeoCard, NeoCardContent } from "@/components/neo/neo-card"
import {
    NeoTable, NeoTableContainer, NeoTableHeader,
    NeoTableRow, NeoTableHead, NeoTableCell,
    NeoTableLoading, NeoTableEmpty
} from "@/components/neo/neo-table"
import { NeoDialog, NeoDialogContent, NeoDialogHeader, NeoDialogTitle, NeoDialogDescription, NeoDialogTrigger, NeoDialogBody, NeoDialogActions } from "@/components/neo/neo-dialog"
import { NeoInput } from "@/components/neo/neo-input"
import { Package, PlusCircle, Pencil, Tag, Percent, Download, X, Check } from "lucide-react"

export default function PackagesPage() {
    const [packages, setPackages] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)

    useEffect(() => {
        const propertyId = "HOTEL_001"
        fetch(`/api/v1/admin/packages?propertyId=${propertyId}`)
            .then(res => res.json())
            .then(data => {
                setPackages(data.packages || [])
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [])

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/40">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight font-heading text-foreground">
                        Pacotes & Ofertas
                    </h1>
                    <p className="text-muted-foreground font-medium tracking-wide">
                        Gerencie pacotes combinados de quartos e serviços.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="inline-flex h-10 items-center justify-center rounded-lg border border-border/50 bg-secondary/30 px-4 py-2 text-sm font-semibold text-foreground transition-all hover:bg-secondary">
                        <Download className="mr-2 h-4 w-4 text-muted-foreground" />
                        Exportar
                    </button>
                    <NeoDialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <NeoDialogTrigger asChild>
                            <button className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:-translate-y-0.5">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Novo Pacote
                            </button>
                        </NeoDialogTrigger>
                        <NeoDialogContent className="sm:max-w-[500px]">
                            <NeoDialogHeader>
                                <NeoDialogTitle>Criar Novo Pacote</NeoDialogTitle>
                                <NeoDialogDescription>
                                    Configure um pacote com quarto e serviços adicionais.
                                </NeoDialogDescription>
                            </NeoDialogHeader>
                            <NeoDialogBody>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            Código Interno
                                        </label>
                                        <NeoInput placeholder="ex: SUMMER_SPECIAL_2026" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            Nome Público
                                        </label>
                                        <NeoInput placeholder="ex: Especial de Verão" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                                Preço Base
                                            </label>
                                            <NeoInput type="number" placeholder="0.00" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                                Desconto (%)
                                            </label>
                                            <NeoInput type="number" placeholder="0" />
                                        </div>
                                    </div>
                                </div>
                            </NeoDialogBody>
                            <NeoDialogActions>
                                <button onClick={() => setDialogOpen(false)} className="inline-flex h-10 items-center justify-center rounded-lg border border-border/50 px-6 text-sm font-semibold text-muted-foreground transition-all hover:bg-secondary">
                                    <X className="mr-2 h-4 w-4" />Cancelar
                                </button>
                                <button className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90">
                                    <Check className="mr-2 h-4 w-4" />Criar Pacote
                                </button>
                            </NeoDialogActions>
                        </NeoDialogContent>
                    </NeoDialog>
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: "Pacotes Ativos", value: packages.filter(p => p.active).length.toString(), icon: Package, color: "text-blue-500" },
                    { label: "Desconto Médio", value: "12%", icon: Percent, color: "text-green-500" },
                    { label: "Total de Pacotes", value: packages.length.toString(), icon: Tag, color: "text-violet-500" },
                ].map(stat => (
                    <NeoCard key={stat.label} glass className="p-4">
                        <NeoCardContent className="p-0">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg bg-secondary/50 ${stat.color}`}>
                                    <stat.icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{stat.label}</p>
                                    <p className="text-2xl font-bold font-heading">{loading ? "—" : stat.value}</p>
                                </div>
                            </div>
                        </NeoCardContent>
                    </NeoCard>
                ))}
            </div>

            {/* Table */}
            <NeoCard className="border-t-4 border-t-primary shadow-sm" glass>
                <NeoCardContent className="p-0">
                    <NeoTableContainer>
                        <NeoTable>
                            <NeoTableHeader>
                                <NeoTableRow className="bg-secondary/20">
                                    <NeoTableHead className="font-bold tracking-wider text-xs uppercase">Código</NeoTableHead>
                                    <NeoTableHead className="font-bold tracking-wider text-xs uppercase">Nome</NeoTableHead>
                                    <NeoTableHead className="font-bold tracking-wider text-xs uppercase">Preço Final</NeoTableHead>
                                    <NeoTableHead className="font-bold tracking-wider text-xs uppercase">Desconto</NeoTableHead>
                                    <NeoTableHead className="font-bold tracking-wider text-xs uppercase">Status</NeoTableHead>
                                    <NeoTableHead className="text-right font-bold tracking-wider text-xs uppercase">Ações</NeoTableHead>
                                </NeoTableRow>
                            </NeoTableHeader>
                            <tbody>
                                {loading && <NeoTableLoading rows={4} cols={6} />}
                                {!loading && packages.length === 0 && (
                                    <NeoTableEmpty
                                        colSpan={6}
                                        icon={<Package className="h-10 w-10" />}
                                        title="Nenhum pacote encontrado"
                                        message="Crie o primeiro pacote clicando em 'Novo Pacote'."
                                    />
                                )}
                                {!loading && packages.map((pkg) => (
                                    <NeoTableRow key={pkg.id}>
                                        <NeoTableCell>
                                            <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                                                {pkg.code || "N/A"}
                                            </span>
                                        </NeoTableCell>
                                        <NeoTableCell className="font-medium">{pkg.name}</NeoTableCell>
                                        <NeoTableCell className="font-semibold">
                                            {pkg.finalPrice != null ? `R$ ${Number(pkg.finalPrice).toFixed(2)}` : "—"}
                                        </NeoTableCell>
                                        <NeoTableCell>
                                            {pkg.discountPct != null ? (
                                                <span className="text-green-500 font-semibold">{pkg.discountPct}%</span>
                                            ) : "—"}
                                        </NeoTableCell>
                                        <NeoTableCell>
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${pkg.active
                                                ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                                                : 'bg-secondary text-muted-foreground border border-border'
                                                }`}>
                                                <span className={`h-1.5 w-1.5 rounded-full ${pkg.active ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                                                {pkg.active ? 'Ativo' : 'Rascunho'}
                                            </span>
                                        </NeoTableCell>
                                        <NeoTableCell className="text-right">
                                            <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border/50 bg-secondary/30 text-xs font-semibold text-foreground transition-all hover:bg-secondary hover:border-primary/40">
                                                <Pencil className="h-3 w-3" />
                                                Editar
                                            </button>
                                        </NeoTableCell>
                                    </NeoTableRow>
                                ))}
                            </tbody>
                        </NeoTable>
                    </NeoTableContainer>
                </NeoCardContent>
            </NeoCard>
        </div>
    )
}
