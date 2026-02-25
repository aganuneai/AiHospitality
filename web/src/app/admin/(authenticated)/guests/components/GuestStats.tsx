import { Users, Diamond, Luggage, UserPlus } from 'lucide-react'
import { NeoCard, NeoCardContent } from '@/components/neo'

interface GuestStatsProps {
    stats: {
        total: number
        vips: number
        inHouse: number
        newThisMonth: number
    }
}

export function GuestStats({ stats }: GuestStatsProps) {
    const items = [
        {
            label: 'Hóspedes Totais',
            value: stats.total.toLocaleString(),
            icon: Users,
            color: 'text-indigo-500',
            bgColor: 'bg-indigo-500/10',
        },
        {
            label: 'Membros VIP',
            value: stats.vips.toLocaleString(),
            icon: Diamond,
            color: 'text-amber-500',
            bgColor: 'bg-amber-500/10',
        },
        {
            label: 'Estadias Ativas',
            value: stats.inHouse.toLocaleString(),
            icon: Luggage,
            color: 'text-emerald-500',
            bgColor: 'bg-emerald-500/10',
        },
        {
            label: 'Novos este Mês',
            value: stats.newThisMonth.toLocaleString(),
            icon: UserPlus,
            color: 'text-rose-500',
            bgColor: 'bg-rose-500/10',
        },
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {items.map((item, idx) => (
                <NeoCard key={idx} className="border-border/40 shadow-sm overflow-hidden group">
                    <NeoCardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl ${item.bgColor} flex items-center justify-center transition-transform group-hover:scale-110 duration-300`}>
                                <item.icon className={`w-6 h-6 ${item.color}`} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1.5">{item.label}</p>
                                <h3 className="text-2xl font-bold tracking-tight">{item.value}</h3>
                            </div>
                        </div>
                    </NeoCardContent>
                </NeoCard>
            ))}
        </div>
    )
}
