import * as React from "react"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetClose
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export const NeoSheet = Sheet
export const NeoSheetTrigger = SheetTrigger
export const NeoSheetClose = SheetClose

export function NeoSheetContent({ className, ...props }: React.ComponentProps<typeof SheetContent>) {
    return (
        <SheetContent
            className={cn("border-l-border/40 bg-background/80 backdrop-blur-md shadow-2xl rounded-none data-[state=open]:animate-in data-[state=closed]:animate-out", className)}
            {...props}
        />
    )
}

export function NeoSheetHeader({ className, ...props }: React.ComponentProps<typeof SheetHeader>) {
    return (
        <SheetHeader className={cn("space-y-1 pb-4 border-b border-border/10", className)} {...props} />
    )
}

export function NeoSheetTitle({ className, ...props }: React.ComponentProps<typeof SheetTitle>) {
    return (
        <SheetTitle className={cn("font-heading text-lg font-bold tracking-tight uppercase", className)} {...props} />
    )
}

export function NeoSheetDescription({ className, ...props }: React.ComponentProps<typeof SheetDescription>) {
    return (
        <SheetDescription className={cn("text-sm text-muted-foreground font-mono", className)} {...props} />
    )
}
