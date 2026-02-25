'use client';

import { useState } from 'react';
import { subDays, format as formatDate } from 'date-fns';
import { Download, FileText, Table } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useRevenueData } from '../revenue/hooks/useRevenueData';
import { useOccupancyData } from '../occupancy/hooks/useOccupancyData';
import { exportToCSV, formatRevenueDataForCSV, formatOccupancyDataForCSV } from '@/lib/utils/export-csv';
import { exportToPDF } from '@/lib/utils/export-pdf';

type ReportTemplate = 'revenue' | 'occupancy' | 'channel' | 'custom';
type ExportFormat = 'csv' | 'pdf';
type DateRange = '7' | '30' | '60' | '90';
type GroupBy = 'day' | 'week' | 'month';

export default function ReportsPage() {
    const [template, setTemplate] = useState<ReportTemplate>('revenue');
    const [dateRange, setDateRange] = useState<DateRange>('30');
    const [groupBy, setGroupBy] = useState<GroupBy>('day');
    const [isExporting, setIsExporting] = useState(false);

    const to = new Date();
    const from = subDays(to, parseInt(dateRange));

    // Fetch data based on template
    const { revenueData, summary: revenueSummary } = useRevenueData(from, to, groupBy);
    const { occupancyData, summary: occupancySummary } = useOccupancyData(from, to);

    const handleExport = async (format: ExportFormat) => {
        setIsExporting(true);

        try {
            const timestamp = formatDate(new Date(), 'yyyyMMdd_HHmmss');
            const filename = `${template}_report_${timestamp}`;

            if (format === 'csv') {
                // Export to CSV
                if (template === 'revenue') {
                    const formattedData = formatRevenueDataForCSV(revenueData);
                    exportToCSV({
                        filename,
                        data: formattedData
                    });
                } else if (template === 'occupancy') {
                    const formattedData = formatOccupancyDataForCSV(occupancyData);
                    exportToCSV({
                        filename,
                        data: formattedData
                    });
                }
            } else if (format === 'pdf') {
                // Export to PDF
                await exportToPDF({
                    filename,
                    title: `${template.charAt(0).toUpperCase() + template.slice(1)} Report`,
                    subtitle: `Period: ${formatDate(from, 'dd/MM/yyyy')} - ${formatDate(to, 'dd/MM/yyyy')}`,
                    elementId: 'report-preview'
                });
            }

            // Success notification
            alert('Relatório exportado com sucesso!');
        } catch (error) {
            console.error('Export error:', error);
            alert('Erro ao exportar relatório. Tente novamente.');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Custom Reports</h1>
                <p className="text-muted-foreground mt-1">
                    Crie e exporte relatórios personalizados
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Report Builder */}
                <Card>
                    <CardHeader>
                        <CardTitle>Report Builder</CardTitle>
                        <CardDescription>Configure e gere seu relatório</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Step 1: Select Template */}
                        <div className="space-y-3">
                            <Label className="text-base font-semibold">1. Select Template</Label>
                            <RadioGroup value={template} onValueChange={(v: string) => setTemplate(v as ReportTemplate)}>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="revenue" id="revenue" />
                                    <Label htmlFor="revenue" className="font-normal cursor-pointer">
                                        Revenue Report
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="occupancy" id="occupancy" />
                                    <Label htmlFor="occupancy" className="font-normal cursor-pointer">
                                        Occupancy Report
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="channel" id="channel" />
                                    <Label htmlFor="channel" className="font-normal cursor-pointer">
                                        Channel Performance
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="custom" id="custom" disabled />
                                    <Label htmlFor="custom" className="font-normal cursor-pointer text-muted-foreground">
                                        Custom (Coming Soon)
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>

                        {/* Step 2: Configure Parameters */}
                        <div className="space-y-3">
                            <Label className="text-base font-semibold">2. Configure Parameters</Label>

                            <div className="space-y-2">
                                <Label>Date Range</Label>
                                <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="7">Last 7 days</SelectItem>
                                        <SelectItem value="30">Last 30 days</SelectItem>
                                        <SelectItem value="60">Last 60 days</SelectItem>
                                        <SelectItem value="90">Last 90 days</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {template === 'revenue' && (
                                <div className="space-y-2">
                                    <Label>Group By</Label>
                                    <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="day">Day</SelectItem>
                                            <SelectItem value="week">Week</SelectItem>
                                            <SelectItem value="month">Month</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        {/* Step 3: Export */}
                        <div className="space-y-3">
                            <Label className="text-base font-semibold">3. Export</Label>
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => handleExport('csv')}
                                    disabled={isExporting}
                                    className="flex-1"
                                >
                                    <Table className="mr-2 h-4 w-4" />
                                    Export CSV
                                </Button>
                                <Button
                                    onClick={() => handleExport('pdf')}
                                    disabled={isExporting}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    <FileText className="mr-2 h-4 w-4" />
                                    Export PDF
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Preview */}
                <Card>
                    <CardHeader>
                        <CardTitle>Preview</CardTitle>
                        <CardDescription>
                            {template === 'revenue' && 'Revenue analytics preview'}
                            {template === 'occupancy' && 'Occupancy analytics preview'}
                            {template === 'channel' && 'Channel performance preview'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div id="report-preview" className="space-y-4">
                            {template === 'revenue' && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Total Revenue:</span>
                                        <span className="font-semibold">
                                            ${revenueSummary.totalRevenue.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Total Bookings:</span>
                                        <span className="font-semibold">{revenueSummary.totalBookings}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Average ADR:</span>
                                        <span className="font-semibold">
                                            ${revenueSummary.avgAdr.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">RevPAR:</span>
                                        <span className="font-semibold">
                                            ${revenueSummary.avgRevpar.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-4">
                                        {revenueData.length} data points
                                    </div>
                                </div>
                            )}

                            {template === 'occupancy' && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Avg Occupancy:</span>
                                        <span className="font-semibold">
                                            {occupancySummary.avgOccupancy.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Peak Occupancy:</span>
                                        <span className="font-semibold">
                                            {occupancySummary.peakOccupancy.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Peak Date:</span>
                                        <span className="font-semibold">{occupancySummary.peakDate}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Lowest Occupancy:</span>
                                        <span className="font-semibold">
                                            {occupancySummary.lowestOccupancy.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-4">
                                        {occupancyData.length} data points
                                    </div>
                                </div>
                            )}

                            {template === 'channel' && (
                                <div className="text-sm text-muted-foreground">
                                    Channel performance report (coming soon)
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Info Card */}
            <Card className="bg-muted/50">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                        <Download className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-sm font-medium">Export Formats</p>
                            <p className="text-sm text-muted-foreground">
                                <strong>CSV:</strong> Ideal para análise em Excel/Google Sheets. Inclui todos os dados tabulares.
                            </p>
                            <p className="text-sm text-muted-foreground">
                                <strong>PDF:</strong> Relatório formatado pronto para apresentação. Inclui gráficos e resumo.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
