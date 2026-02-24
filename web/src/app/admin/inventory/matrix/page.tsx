'use client';

import { Suspense } from 'react';
import { AvailabilityMatrix } from '@/components/analytics/availability-matrix/AvailabilityMatrix';
import { LayoutGrid } from 'lucide-react';

export default function InventoryMatrixPage() {
    return (
        <div className="space-y-8 pb-20 animate-in fade-in duration-700">
            {/* Premium Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/40">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight font-heading text-foreground">
                        Matriz Cockpit
                    </h1>
                    <p className="text-muted-foreground font-medium tracking-wide">
                        Visão estratégica de 30 dias com controle de disponibilidade e ocupação futura.
                    </p>
                </div>
            </div>

            <Suspense fallback={
                <div className="h-[400px] flex items-center justify-center bg-card/10 rounded-2xl border border-dashed border-border/50">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
                </div>
            }>
                <AvailabilityMatrix />
            </Suspense>
        </div>
    );
}
