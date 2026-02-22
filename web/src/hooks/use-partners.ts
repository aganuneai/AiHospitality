"use client"

import { useNeoFetch } from "./use-neo-api"

export type PartnerType = "AGENCY" | "COMPANY" | "OTA" | "CORPORATE"

export interface Partner {
    id: string
    type: PartnerType
    name: string
    code: string
    email: string | null
    phone: string | null
    country: string | null
    commission: number | null
    contractRef: string | null
    active: boolean
}

interface PartnersResponse {
    partners: Partner[]
}

export function usePartners() {
    const { data, loading, error, refetch } = useNeoFetch<PartnersResponse>(
        "/api/v1/admin/partners?propertyId=HOTEL_001"
    )

    return {
        partners: data?.partners || [],
        loading,
        error,
        refetch
    }
}
