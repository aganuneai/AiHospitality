import { NeoSidebar } from "@/components/neo/neo-sidebar"
import { NeoTopbar } from "@/components/neo/neo-topbar"
import { NeoToaster } from "@/components/neo/neo-toaster"
import { NeoErrorBoundary } from "@/components/neo"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col md:flex-row bg-background font-sans text-foreground selection:bg-primary/20 selection:text-primary overflow-hidden">
            <NeoSidebar />
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <NeoTopbar />
                <main className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar">
                    <div className="mx-auto max-w-7xl animate-in fade-in duration-700 slide-in-from-bottom-8">
                        <NeoErrorBoundary>
                            {children}
                        </NeoErrorBoundary>
                    </div>
                </main>
            </div>
            <NeoToaster />
        </div>
    )
}
