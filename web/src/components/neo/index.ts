/**
 * @layer neo — Public Component Layer
 *
 * This is the ONLY layer that pages and features should import from.
 * Neo components wrap ui/ primitives and apply brand identity, design tokens,
 * and consistent behavior across the application.
 *
 * RULES:
 * ✅ Pages import from "@/components/neo" (this file)
 * ✅ Neo components can import from "@/components/ui" internally
 * ❌ Pages should NOT import directly from "@/components/ui"
 * ❌ Neo components should NOT import from other neo components
 *
 * Architecture: ui/ (Shadcn primitives) → neo/ (brand layer) → pages
 */

export { NeoButton } from './neo-button'
export { NeoCard, NeoCardContent, NeoCardHeader, NeoCardTitle, NeoCardDescription, NeoCardFooter } from './neo-card'
export { NeoInput } from './neo-input'
export { NeoSheet, NeoSheetContent, NeoSheetHeader, NeoSheetTitle, NeoSheetDescription } from './neo-sheet'
export { NeoSidebar } from './neo-sidebar'
export { NeoErrorState } from './neo-error-state'
export { NeoErrorBoundary } from './neo-error-boundary'
export { NeoEmptyState } from './neo-empty-state'
export { NeoToaster } from './neo-toaster'
export {
    NeoTable,
    NeoTableContainer,
    NeoTableHeader,
    NeoTableRow,
    NeoTableHead,
    NeoTableCell,
    NeoTableLoading,
    NeoTableEmpty,
    NeoTableError,
} from './neo-table'
export { neoTokens, type NeoTokens } from './neo-tokens'

