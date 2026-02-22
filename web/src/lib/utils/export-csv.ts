import Papa from 'papaparse';

export interface ExportOptions {
    filename: string;
    data: any[];
    headers?: string[];
}

/**
 * Export data to CSV file
 */
export function exportToCSV({ filename, data, headers }: ExportOptions): void {
    if (!data || data.length === 0) {
        throw new Error('No data to export');
    }

    // Convert data to CSV
    const csv = Papa.unparse(data, {
        header: true,
        columns: headers
    });

    // Create blob
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

    // Create download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup
    URL.revokeObjectURL(url);
}

/**
 * Format revenue data for CSV export
 */
export function formatRevenueDataForCSV(data: any[]) {
    return data.map(item => ({
        'Period': item.period,
        'Revenue': `$${item.revenue.toFixed(2)}`,
        'Bookings': item.bookings,
        'Room Nights': item.roomNights,
        'ADR': `$${item.adr.toFixed(2)}`,
        'RevPAR': `$${item.revpar.toFixed(2)}`
    }));
}

/**
 * Format occupancy data for CSV export
 */
export function formatOccupancyDataForCSV(data: any[]) {
    return data.map(item => ({
        'Date': item.date,
        'Total Rooms': item.totalRooms,
        'Booked Rooms': item.bookedRooms,
        'Available Rooms': item.availableRooms,
        'Occupancy Rate': `${item.occupancyRate.toFixed(1)}%`
    }));
}

/**
 * Format channel performance data for CSV export
 */
export function formatChannelDataForCSV(data: any[]) {
    return data.map(item => ({
        'Channel': item.channelCode,
        'Bookings': item.bookings,
        'Revenue': `$${item.revenue.toFixed(2)}`,
        'Avg Room Nights': item.avgRoomNights.toFixed(1),
        'Avg Booking Value': `$${item.avgBookingValue.toFixed(2)}`
    }));
}
