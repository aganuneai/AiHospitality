'use client';

import { Suspense, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { NeoSidebar } from "@/components/neo/neo-sidebar"
import { NeoTopbar } from "@/components/neo/neo-topbar"
import { NeoErrorBoundary } from "@/components/neo"

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const [isAuthorized, setIsAuthorized] = useState(false)

    useEffect(() => {
        // Check for auth token in localStorage (secondary check for UI state)
        const token = localStorage.getItem('auth_token')

        if (!token) {
            console.log('[AuthGuard] No token found in client. Redirecting...')
            router.push('/admin/login')
        } else {
            setIsAuthorized(true)
        }
    }, [router])

    if (!isAuthorized) {
        return <div className="min-h-screen bg-background animate-pulse" />
    }

    return (
        <div className="flex min-h-screen flex-col md:flex-row bg-background font-sans text-foreground selection:bg-primary/20 selection:text-primary overflow-hidden">
            <Suspense fallback={<div className="w-72 border-r border-border/50 bg-sidebar/80 h-screen animate-pulse" />}>
                <NeoSidebar />
            </Suspense>
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
        </div>
    )
}
