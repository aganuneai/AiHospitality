"use client"

import { Toaster } from "sonner"

// NeoToaster: thin wrapper configurado com o design system da plataforma
export function NeoToaster() {
    return (
        <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
                classNames: {
                    toast: "font-sans text-sm rounded-none border border-border",
                    title: "font-bold uppercase tracking-widest text-xs",
                    description: "text-muted-foreground text-xs",
                    success: "!bg-background !border-green-500/40 !text-green-400",
                    error: "!bg-background !border-destructive/40 !text-destructive",
                }
            }}
        />
    )
}
