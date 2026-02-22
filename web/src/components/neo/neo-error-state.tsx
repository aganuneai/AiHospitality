import * as React from "react"
import { cn } from "@/lib/utils"
import { NeoButton } from "./neo-button"
import { neoTokens } from "./neo-tokens"

// ── Types ─────────────────────────────────────────────────────────────────────

type ErrorSeverity = "error" | "warning" | "info"

export interface NeoErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
    title?: string
    message?: string
    code?: string | number          // e.g. "500" or "NOT_FOUND"
    severity?: ErrorSeverity
    icon?: React.ReactNode
    error?: any                     // Support for full error objects from hooks
    // Primary action (retry / reload)
    onRetry?: () => void
    retryLabel?: string
    // Secondary action (go back / contact support)
    onSecondary?: () => void
    secondaryLabel?: string
}

// ── Config per severity ────────────────────────────────────────────────────────

const CONFIG: Record<ErrorSeverity, {
    iconColor: string
    titleColor: string
    codeColor: string
    borderColor: string
    icon: React.ReactNode
}> = {
    error: {
        iconColor: neoTokens.feedback.error.icon,
        titleColor: neoTokens.feedback.error.title,
        codeColor: neoTokens.feedback.error.code,
        borderColor: neoTokens.feedback.error.border,
        icon: (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
        ),
    },
    warning: {
        iconColor: neoTokens.feedback.warning.icon,
        titleColor: neoTokens.feedback.warning.title,
        codeColor: neoTokens.feedback.warning.code,
        borderColor: neoTokens.feedback.warning.border,
        icon: (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
        ),
    },
    info: {
        iconColor: neoTokens.feedback.info.icon,
        titleColor: neoTokens.feedback.info.title,
        codeColor: neoTokens.feedback.info.code,
        borderColor: neoTokens.feedback.info.border,
        icon: (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
        ),
    },
}

// ── Component ─────────────────────────────────────────────────────────────────

export function NeoErrorState({
    title,
    message,
    code,
    severity = "error",
    icon,
    error,
    onRetry,
    retryLabel = "Tentar novamente",
    onSecondary,
    secondaryLabel = "Voltar",
    className,
    ...props
}: NeoErrorStateProps) {
    const cfg = CONFIG[severity]

    // Priority: Explicit props > Error Object > Defaults
    const displayTitle = title || error?.message || "Algo deu errado"
    const displayMessage = message || error?.details || (error ? "Ocorreu um erro ao processar sua solicitação." : "Ocorreu um erro inesperado. Tente novamente.")
    const displayCode = code || error?.code

    return (
        <div
            role="alert"
            aria-live="assertive"
            className={cn(
                "flex flex-col items-center justify-center gap-5 py-16 px-8 text-center",
                neoTokens.geometry.accentBorder,
                cfg.borderColor,
                neoTokens.motion.enter,
                className
            )}
            {...props}
        >
            {/* Icon */}
            <div className={cn("opacity-80", cfg.iconColor)}>
                {icon ?? cfg.icon}
            </div>

            {/* Text block */}
            <div className="space-y-2">
                {/* Error code badge */}
                {displayCode && (
                    <p className={cn(
                        "font-mono text-xs tracking-widest uppercase mb-1",
                        cfg.codeColor
                    )}>
                        [{displayCode}]
                    </p>
                )}

                <p className={cn(
                    "text-sm font-bold",
                    neoTokens.typography.label,
                    cfg.titleColor
                )}>
                    {displayTitle}
                </p>

                <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                    {displayMessage}
                </p>
            </div>

            {/* Actions */}
            {(onRetry || onSecondary) && (
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
                    {onRetry && (
                        <NeoButton
                            variant="outline"
                            size="sm"
                            onClick={onRetry}
                        >
                            {retryLabel}
                        </NeoButton>
                    )}
                </div>
            )}
        </div>
    )
}

NeoErrorState.displayName = "NeoErrorState"
