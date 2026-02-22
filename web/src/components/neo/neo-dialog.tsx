import * as React from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
    DialogFooter
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export const NeoDialog = Dialog
export const NeoDialogTrigger = DialogTrigger
export const NeoDialogClose = DialogClose
export const NeoDialogFooter = DialogFooter

export function NeoDialogContent({ className, children, ...props }: React.ComponentProps<typeof DialogContent>) {
    return (
        <DialogContent
            className={cn(
                "bg-background/80 backdrop-blur-xl border border-border/40 shadow-2xl",
                "max-w-2xl w-[95vw] rounded-2xl overflow-hidden p-0 gap-0",
                "animate-in fade-in zoom-in-95 duration-200",
                className
            )}
            {...props}
        >
            <div className="flex flex-col h-full max-h-[85vh]">
                {children}
            </div>
        </DialogContent>
    )
}

export function NeoDialogHeader({ className, ...props }: React.ComponentProps<typeof DialogHeader>) {
    return (
        <DialogHeader
            className={cn(
                "p-6 px-8 border-b border-border/10 bg-secondary/10 space-y-1.5",
                className
            )}
            {...props}
        />
    )
}

export function NeoDialogTitle({ className, ...props }: React.ComponentProps<typeof DialogTitle>) {
    return (
        <DialogTitle
            className={cn(
                "font-heading text-xl font-black tracking-tight uppercase text-foreground",
                className
            )}
            {...props}
        />
    )
}

export function NeoDialogDescription({ className, ...props }: React.ComponentProps<typeof DialogDescription>) {
    return (
        <DialogDescription
            className={cn(
                "text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-70",
                className
            )}
            {...props}
        />
    )
}

export function NeoDialogBody({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            className={cn(
                "p-8 overflow-y-auto custom-scrollbar flex-1",
                className
            )}
            {...props}
        />
    )
}

export function NeoDialogActions({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            className={cn(
                "p-4 px-8 border-t border-border/10 bg-secondary/5 flex items-center justify-end gap-3 shrink-0",
                className
            )}
            {...props}
        />
    )
}
