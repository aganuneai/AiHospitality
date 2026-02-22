import * as React from "react"
import { cn } from "@/lib/utils"
import { NeoButton } from "./neo-button"
import { neoTokens } from "./neo-tokens"

// ── Types ─────────────────────────────────────────────────────────────────────

type EmptyVariant = "default" | "search" | "filtered" | "first-time"

export interface NeoEmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
    title?: string
    message?: string
    variant?: EmptyVariant
    icon?: React.ReactNode
    // Primary action
    actionLabel?: string
    onAction?: () => void
    // Secondary action (e.g. clear filters)
    secondaryLabel?: string
    onSecondary?: () => void
}

// ── Icons per variant ─────────────────────────────────────────────────────────

const ICONS: Record<EmptyVariant, React.ReactNode> = {
    default: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="0" />
            <path d="M9 9h6M9 12h4" />
        </svg>
    ),
    search: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
    ),
    filtered: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            <line x1="2" y1="2" x2="22" y2="22" strokeDasharray="3 3" />
        </svg>
    ),
    "first-time": (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    ),
}

const DEFAULT_COPY: Record<EmptyVariant, { title: string; message: string }> = {
    default: {
        title: "Nenhum registro encontrado",
        message: "Quando houver dados, eles aparecerão aqui.",
    },
    search: {
        title: "Sem resultados para sua busca",
        message: "Tente termos diferentes ou verifique a ortografia.",
    },
    filtered: {
        title: "Nenhum item com esses filtros",
        message: "Ajuste ou limpe os filtros para ver mais resultados.",
    },
    "first-time": {
        title: "Tudo pronto para começar",
        message: "Ainda não há nada aqui. Crie o primeiro item para começar.",
    },
}

// ── Component ─────────────────────────────────────────────────────────────────

export function NeoEmptyState({
    title,
    message,
    variant = "default",
    icon,
    actionLabel,
    onAction,
    secondaryLabel = "Limpar filtros",
    onSecondary,
    className,
    ...props
}: NeoEmptyStateProps) {
    const copy = DEFAULT_COPY[variant]
    const resolvedTitle = title ?? copy.title
    const resolvedMessage = message ?? copy.message

    return (
        <div
            aria-label={resolvedTitle}
            className={cn(
                "flex flex-col items-center justify-center gap-5 py-16 px-8 text-center",
                neoTokens.motion.enter,
                className
            )}
            {...props}
        >
            {/* Icon */}
            <div className="text-muted-foreground/30">
                {icon ?? ICONS[variant]}
            </div>

            {/* Text block */}
            <div className="space-y-2">
                <p className={cn("text-sm font-bold", neoTokens.typography.label, "text-muted-foreground")}>
                    {resolvedTitle}
                </p>
                <p className="text-xs text-muted-foreground/60 max-w-xs leading-relaxed">
                    {resolvedMessage}
                </p>
            </div>

            {/* Actions */}
            {(onAction || onSecondary) && (
                <div className="flex items-center gap-3 mt-1">
                    {onSecondary && (
                        <NeoButton
                            variant="ghost"
                            size="sm"
                            onClick={onSecondary}
                        >
                            {secondaryLabel}
                        </NeoButton>
                    )}
                    {onAction && actionLabel && (
                        <NeoButton
                            variant="neo"
                            size="sm"
                            onClick={onAction}
                        >
                            {actionLabel}
                        </NeoButton>
                    )}
                </div>
            )}
        </div>
    )
}

NeoEmptyState.displayName = "NeoEmptyState"
