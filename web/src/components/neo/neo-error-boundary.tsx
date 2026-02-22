"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import { NeoErrorState } from "./neo-error-state"
import { NeoButton } from "./neo-button"

interface Props {
    children: ReactNode
    fallback?: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
}

export class NeoErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo)
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null })
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback
            }

            return (
                <div className="min-h-[400px] flex items-center justify-center p-8">
                    <NeoErrorState
                        severity="error"
                        title="UI Runtime Error"
                        message={this.state.error?.message || "Algo deu errado durante a renderização da interface."}
                        onRetry={this.handleReset}
                        retryLabel="Tentar novamente"
                    />
                </div>
            )
        }

        return this.props.children
    }
}
