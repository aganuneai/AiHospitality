import * as React from "react"
import { cn } from "@/lib/utils"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { NeoErrorState, NeoErrorStateProps } from "./neo-error-state"
import { NeoEmptyState, NeoEmptyStateProps } from "./neo-empty-state"
import { neoTokens } from "./neo-tokens"

interface NeoTableProps extends React.HTMLAttributes<HTMLDivElement> {
    dense?: boolean;
}

export function NeoTableContainer({ className, dense, ...props }: NeoTableProps) {
    return (
        <div className={cn("relative w-full overflow-auto", neoTokens.surface.glass, "shadow-sm", className)} {...props} />
    )
}

export function NeoTable({ className, ...props }: React.ComponentProps<typeof Table>) {
    return <Table className={cn("text-sm", className)} {...props} />
}

export function NeoTableHeader({ className, ...props }: React.ComponentProps<typeof TableHeader>) {
    return <TableHeader className={cn(neoTokens.surface.muted, "uppercase tracking-wider text-xs font-semibold text-muted-foreground", className)} {...props} />
}

export function NeoTableRow({ className, ...props }: React.ComponentProps<typeof TableRow>) {
    return <TableRow className={cn(neoTokens.surface.hoverHighlight, "border-border/20", neoTokens.motion.colors, "data-[state=selected]:bg-muted", className)} {...props} />
}

export function NeoTableHead({ className, ...props }: React.ComponentProps<typeof TableHead>) {
    return <TableHead className={cn("h-10 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0", className)} {...props} />
}

export function NeoTableCell({ className, ...props }: React.ComponentProps<typeof TableCell>) {
    return <TableCell className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0 font-mono text-xs", className)} {...props} />
}

// ── State Variants ────────────────────────────────────────────────────────────

interface NeoTableLoadingProps {
    rows?: number
    cols?: number
}

/** Skeleton rows inside a tbody — use directly inside <NeoTable><tbody> */
export function NeoTableLoading({ rows = 5, cols = 4 }: NeoTableLoadingProps) {
    return (
        <>
            {Array.from({ length: rows }).map((_, i) => (
                <NeoTableRow key={i} className="animate-pulse">
                    {Array.from({ length: cols }).map((_, j) => (
                        <NeoTableCell key={j}>
                            <div className="h-3 bg-muted/60 rounded-none w-3/4" />
                        </NeoTableCell>
                    ))}
                </NeoTableRow>
            ))}
        </>
    )
}

interface NeoTableEmptyProps extends NeoEmptyStateProps {
    colSpan: number
}

/** Full-width empty state row — use inside <NeoTable><tbody> */
export function NeoTableEmpty({ colSpan, ...props }: NeoTableEmptyProps) {
    return (
        <tr>
            <td colSpan={colSpan}>
                <NeoEmptyState {...props} />
            </td>
        </tr>
    )
}

interface NeoTableErrorProps extends NeoErrorStateProps {
    colSpan: number
}

/** Full-width error state row — use inside <NeoTable><tbody> */
export function NeoTableError({ colSpan, ...props }: NeoTableErrorProps) {
    return (
        <tr>
            <td colSpan={colSpan}>
                <NeoErrorState {...props} />
            </td>
        </tr>
    )
}

