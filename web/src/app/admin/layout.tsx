import { NeoToaster } from "@/components/neo/neo-toaster"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-background font-sans text-foreground selection:bg-primary/20 selection:text-primary">
            {children}
            <NeoToaster />
        </div>
    )
}
