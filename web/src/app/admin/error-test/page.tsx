"use client"

import { useState } from "react"
import { NeoButton, NeoCard, NeoCardContent, NeoErrorBoundary } from "@/components/neo"
import { useNeoApi } from "@/hooks/use-neo-api"

function CrashingComponent() {
    const [shouldCrash, setShouldCrash] = useState(false)

    if (shouldCrash) {
        throw new Error("Simulated UI Crash")
    }

    return (
        <NeoButton variant="destructive" onClick={() => setShouldCrash(true)}>
            Trigger UI Crash
        </NeoButton>
    )
}

export default function ErrorTestPage() {
    const { loading, call } = useNeoApi()

    const handleNetworkError = () => {
        // Calling a non-existent URL to trigger network error
        call(fetch("http://localhost:9999/invalid"))
    }

    const handleServerError = () => {
        // Explicitly fetching a route that usually fails or doesn't exist to get a 404
        call(fetch("/api/v1/invalid-route"))
    }

    return (
        <div className="p-8 space-y-8">
            <h1 className="text-3xl font-bold font-heading uppercase">Error Feedback System Test</h1>

            <section className="space-y-4">
                <h2 className="text-xl font-bold">1. Rendering Recovery (ErrorBoundary)</h2>
                <NeoCard className="p-6">
                    <NeoErrorBoundary>
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">This button is wrapped in a local ErrorBoundary.</p>
                            <CrashingComponent />
                        </div>
                    </NeoErrorBoundary>
                </NeoCard>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-bold">2. API Feedback (useNeoApi)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <NeoCard>
                        <NeoCardContent className="p-6 space-y-4">
                            <h3 className="font-bold">Network / Connect Error</h3>
                            <NeoButton onClick={handleNetworkError} disabled={loading}>
                                {loading ? "Testing..." : "Test Connection Error"}
                            </NeoButton>
                        </NeoCardContent>
                    </NeoCard>

                    <NeoCard>
                        <NeoCardContent className="p-6 space-y-4">
                            <h3 className="font-bold">Server / API Error</h3>
                            <NeoButton onClick={handleServerError} disabled={loading}>
                                {loading ? "Testing..." : "Test Server Error"}
                            </NeoButton>
                        </NeoCardContent>
                    </NeoCard>
                </div>
            </section>
        </div>
    )
}
