import { LucideIcon } from 'lucide-react';
import { NeoCard, NeoCardContent, NeoCardHeader, NeoCardTitle } from '@/components/neo/neo-card';
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from 'lucide-react';

interface KpiCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    format?: 'currency' | 'number' | 'percentage';
}

export function KpiCard({ title, value, icon: Icon, trend, format = 'number' }: KpiCardProps) {
    const formatValue = (val: string | number): string => {
        if (typeof val === 'string') return val;

        switch (format) {
            case 'currency':
                return new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'USD'
                }).format(val);
            case 'percentage':
                return `${val.toFixed(1)}%`;
            case 'number':
            default:
                return new Intl.NumberFormat('pt-BR').format(val);
        }
    };

    const getTrendIcon = () => {
        if (!trend) return null;

        if (trend.value === 0) {
            return <MinusIcon className="h-4 w-4 text-muted-foreground" />;
        }

        return trend.isPositive ? (
            <ArrowUpIcon className="h-4 w-4 text-emerald-500" />
        ) : (
            <ArrowDownIcon className="h-4 w-4 text-rose-500" />
        );
    };

    const getTrendColor = () => {
        if (!trend || trend.value === 0) return 'text-muted-foreground';
        return trend.isPositive ? 'text-emerald-500' : 'text-rose-500';
    };

    return (
        <NeoCard className="shadow-sm border border-border/50 bg-background/50 backdrop-blur-xl group hover:border-primary/40 transition-all duration-300">
            <NeoCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <NeoCardTitle className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                    {title}
                </NeoCardTitle>
                <div className="p-2 bg-secondary/30 rounded-lg group-hover:bg-primary/10 transition-colors">
                    <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
            </NeoCardHeader>
            <NeoCardContent>
                <div className="text-2xl font-bold font-heading tracking-tight text-foreground">{formatValue(value)}</div>
                {trend && (
                    <div className={`flex items-center text-xs font-semibold ${getTrendColor()} mt-2`}>
                        {getTrendIcon()}
                        <span className="ml-1">
                            {Math.abs(trend.value).toFixed(1)}% vs período anterior
                        </span>
                    </div>
                )}
            </NeoCardContent>
        </NeoCard>
    );
}
