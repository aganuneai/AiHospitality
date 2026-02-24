export interface InventoryMatrixResponse {
    roomTypes: { id: string, code: string, name: string }[];
    days: AvailabilityMatrixDay[];
}

export interface AvailabilityMatrixDay {
    date: string;
    availability: Record<string, {
        total: number;
        booked: number;
        available: number;
        price: number;
        occupancy: number;
        status: 'CLEAN' | 'DIRTY' | 'INSPECTION' | 'OOO';
    }>;
    summary: {
        totalAvailable: number;
        avgOccupancy: number;
        avgAvailability: number;
    };
}
