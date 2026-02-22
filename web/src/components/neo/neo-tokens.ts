/**
 * neo-tokens.ts
 *
 * Centralized design token layer for the neo/ component system.
 *
 * Rules:
 *   - All values are Tailwind class strings (no raw CSS values).
 *   - Components MUST import from here instead of hardcoding classes.
 *   - Grouped by category: Geometry, Typography, Surface, Motion, Feedback.
 *
 * Usage:
 *   import { neoTokens } from "@/components/neo/neo-tokens"
 *   cn(neoTokens.geometry.sharp, neoTokens.motion.default)
 */

// ── Geometry ──────────────────────────────────────────────────────────────────

const geometry = {
    /** Brand shape — all Neo components are square-edged */
    sharp: "rounded-none",
    /** Subtle left accent for state blocks (error/empty) */
    accentBorder: "border-l-2",
} as const

// ── Typography ────────────────────────────────────────────────────────────────

const typography = {
    /** Brand label style — used on buttons, table headers, toast titles */
    label: "uppercase tracking-widest font-bold",
    /** Monospaced code/id display */
    mono: "font-mono",
    /** Muted supporting copy */
    supportingText: "text-xs text-muted-foreground",
    /** Section / card heading */
    heading: "font-heading",
} as const

// ── Surface ───────────────────────────────────────────────────────────────────

const surface = {
    /** Default translucent card background */
    glass: "bg-background/40 backdrop-blur-sm border border-border/40",
    /** Subtle muted section bg */
    muted: "bg-muted/30",
    /** Hover highlight (table rows, list items) */
    hoverHighlight: "hover:bg-muted/20",
} as const

// ── Motion ────────────────────────────────────────────────────────────────────

const motion = {
    /** Default interactive transition */
    default: "transition-all duration-300",
    /** Color-only transition (cheaper — use for hover colors) */
    colors: "transition-colors",
    /** State block entry animation */
    enter: "animate-in fade-in duration-300",
} as const

// ── Feedback (semantic state colors) ─────────────────────────────────────────

const feedback = {
    success: {
        icon: "text-green-400",
        border: "border-green-500/40",
        bg: "bg-green-500/10",
        text: "text-green-400",
    },
    warning: {
        icon: "text-yellow-500/80",
        border: "border-yellow-500/20",
        bg: "bg-yellow-500/10",
        text: "text-yellow-500",
        title: "text-yellow-500",
        code: "text-yellow-500/50",
    },
    error: {
        icon: "text-destructive/70",
        border: "border-destructive/20",
        bg: "bg-destructive/10",
        text: "text-destructive",
        title: "text-destructive",
        code: "text-destructive/50",
    },
    info: {
        icon: "text-blue-400/70",
        border: "border-blue-400/20",
        bg: "bg-blue-400/10",
        text: "text-blue-400",
        title: "text-blue-400",
        code: "text-blue-400/50",
    },
} as const

// ── Focus ring ────────────────────────────────────────────────────────────────

const focus = {
    ring: "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
} as const

// ── Disabled state ────────────────────────────────────────────────────────────

const disabled = {
    base: "disabled:pointer-events-none disabled:opacity-50",
} as const

// ── Sizes (shared between inputs and buttons) ─────────────────────────────────

const size = {
    sm: { height: "h-8", padding: "px-3", text: "text-xs" },
    md: { height: "h-9", padding: "px-4 py-2", text: "text-sm" },
    lg: { height: "h-10", padding: "px-8", text: "text-sm" },
    icon: { height: "h-9", width: "w-9" },
} as const

// ── Public API ────────────────────────────────────────────────────────────────

export const neoTokens = {
    geometry,
    typography,
    surface,
    motion,
    feedback,
    focus,
    disabled,
    size,
} as const

export type NeoTokens = typeof neoTokens
