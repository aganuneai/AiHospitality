"use client"

import { useState, useCallback, useEffect } from "react"
import { toast } from "sonner"
import { parseApiError, NeoApiError } from "@/lib/utils/api-utils"

export interface NeoApiOptions {
    toastOnError?: boolean
    toastOnSuccess?: string
    propertyId?: string // Automatic tenant context
}

export function useNeoApi<T = any>() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<NeoApiError | null>(null)

    const call = useCallback(async (
        promise: Promise<Response>,
        options: NeoApiOptions = { toastOnError: true }
    ): Promise<T | null> => {
        setLoading(true)
        setError(null)

        try {
            const response = await promise

            if (!response.ok) {
                throw response // Throw the whole response so parseApiError can read it
            }

            const data = await response.json()

            if (options.toastOnSuccess) {
                toast.success(options.toastOnSuccess)
            }

            setLoading(false)
            return data as T
        } catch (err: any) {
            const parsed = await parseApiError(err)
            setError(parsed)

            if (options.toastOnError) {
                toast.error(parsed.message, {
                    description: parsed.code ? `Error Code: ${parsed.code}` : undefined
                })
            }

            setLoading(false)
            return null
        }
    }, [])

    return {
        loading,
        error,
        call,
        resetError: () => setError(null)
    }
}

/**
 * Automates the common "fetch data on mount" pattern with Neo-flavored error handling
 */
export function useNeoFetch<T>(url: string, options?: NeoApiOptions) {
    const [data, setData] = useState<T | null>(null)
    const { loading, error, call } = useNeoApi<T>()

    const fetchData = useCallback(async () => {
        const fetchOptions: RequestInit = {
            headers: {
                'x-hotel-id': options?.propertyId || 'HOTEL_001'
            }
        }
        const result = await call(fetch(url, fetchOptions), options)
        if (result) setData(result)
    }, [url, call, options])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    return { data, loading, error, refetch: fetchData }
}

/**
 * Hook for data mutations (POST, PUT, DELETE) with Neo-style error handling
 */
export function useNeoMutation<T = any, R = any>(url: string, mutationOptions?: NeoApiOptions & {
    method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    onSuccess?: (data: R) => void,
    onError?: (error: NeoApiError) => void
}) {
    const { loading, error, call } = useNeoApi<R>()

    const mutate = useCallback(async (payload?: T) => {
        const fetchOptions: RequestInit = {
            method: mutationOptions?.method || 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-hotel-id': mutationOptions?.propertyId || 'HOTEL_001'
            },
            body: payload ? JSON.stringify(payload) : undefined
        }

        const result = await call(fetch(url, fetchOptions), mutationOptions)

        if (result) {
            if (mutationOptions?.onSuccess) mutationOptions.onSuccess(result)
        } else if (mutationOptions?.onError) {
            // The error state is updated by call() but we might need it synchronously
            // For now, call() handles the toast.
        }
    }, [url, call, mutationOptions])

    return { mutate, loading, error }
}
