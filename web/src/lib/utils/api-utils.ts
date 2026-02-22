/**
 * api-utils.ts
 *
 * Centralized error parsing for the Neo design system.
 * Converts raw fetch/axios errors or backend responses into user-friendly strings.
 */

export interface NeoApiError {
    message: string
    code?: string | number
    details?: any
    severity: "error" | "warning" | "info"
}

export async function parseApiError(error: any): Promise<NeoApiError> {
    // 1. Network / Generic Errors
    if (error instanceof TypeError && error.message === "Failed to fetch") {
        return {
            message: "Erro de conexão. Verifique sua internet.",
            severity: "error",
            code: "NETWORK_ERROR"
        }
    }

    // 2. Fetch Response Objects
    if (error instanceof Response) {
        try {
            const data = await error.json()

            // Zod Validation Errors (Typical pattern in our backend)
            if (data.errors && Array.isArray(data.errors)) {
                return {
                    message: data.errors[0]?.message || "Dados inválidos.",
                    severity: "warning",
                    code: "VALIDATION_ERROR",
                    details: data.errors
                }
            }

            return {
                message: data.message || `Erro do servidor (${error.status})`,
                severity: error.status >= 500 ? "error" : "warning",
                code: data.code || error.status
            }
        } catch {
            return {
                message: `Erro inesperado no servidor (${error.status})`,
                severity: "error",
                code: error.status
            }
        }
    }

    // 3. Fallback for generic JS Errors
    return {
        message: error.message || "Ocorreu um erro desconhecido.",
        severity: "error"
    }
}
