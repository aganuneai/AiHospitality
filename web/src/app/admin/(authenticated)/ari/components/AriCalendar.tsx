'use client';

import { useState } from 'react';
import { useAriCalendar } from '../hooks/useAriCalendar';
import { useAriUpdate } from '../hooks/useAriUpdate';
import { AriCalendarDay } from '@/lib/types/ari';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AriCalendarProps {
    roomTypeCode: string;
}

export function AriCalendar({ roomTypeCode }: AriCalendarProps) {
    const { days, loading, error, currentMonth, goToPreviousMonth, goToNextMonth, refetch } =
        useAriCalendar({ roomTypeCode });

    const { updateAvailability, updateRate, updateRestrictions } = useAriUpdate({
        onSuccess: () => {
            refetch();
        },
        onError: (error) => {
            alert(`Erro ao atualizar: ${error}`);
        }
    });

    const [editingCell, setEditingCell] = useState<{ date: string; field: string } | null>(null);
    const [editValue, setEditValue] = useState('');

    const getAvailabilityColor = (available: number, total: number): string => {
        if (total === 0) return 'bg-gray-100';
        const percentage = (available / total) * 100;
        if (percentage >= 70) return 'bg-green-50';
        if (percentage >= 30) return 'bg-yellow-50';
        return 'bg-red-50';
    };

    const handleCellClick = (date: string, field: string, currentValue: any) => {
        setEditingCell({ date, field });
        setEditValue(String(currentValue ?? ''));
    };

    const handleCellBlur = async () => {
        if (!editingCell) return;

        const day = days.find(d => d.date === editingCell.date);
        if (!day) return;

        // Update based on field
        if (editingCell.field === 'available') {
            await updateAvailability({
                roomTypeCode,
                dateRange: { from: editingCell.date, to: editingCell.date },
                availability: parseInt(editValue),
                updateType: 'SET'
            });
        } else if (editingCell.field === 'rate') {
            await updateRate({
                roomTypeCode,
                dateRange: { from: editingCell.date, to: editingCell.date },
                baseRate: parseFloat(editValue)
            });
        }

        setEditingCell(null);
    };

    const formatMonth = (date: Date) => {
        return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    };

    if (loading && days.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Carregando calendário...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">Erro ao carregar: {error}</p>
                <Button onClick={() => refetch()} className="mt-2">
                    Tentar Novamente
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header with Month Navigation */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={goToPreviousMonth}
                        disabled={loading}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h2 className="text-lg font-semibold capitalize">
                        {formatMonth(currentMonth)}
                    </h2>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={goToNextMonth}
                        disabled={loading}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
                        <span>Alta ≥70%</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-yellow-50 border border-yellow-200 rounded"></div>
                        <span>Média 30-70%</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
                        <span>Baixa &lt;30%</span>
                    </div>
                </div>
            </div>

            {/* Calendar Table */}
            <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-2 text-left font-medium">Data</th>
                            <th className="px-4 py-2 text-center font-medium">Disponível</th>
                            <th className="px-4 py-2 text-center font-medium">Total</th>
                            <th className="px-4 py-2 text-right font-medium">Tarifa</th>
                            <th className="px-4 py-2 text-center font-medium">MinLOS</th>
                            <th className="px-4 py-2 text-center font-medium">CTA</th>
                            <th className="px-4 py-2 text-center font-medium">CTD</th>
                            <th className="px-4 py-2 text-center font-medium">Closed</th>
                        </tr>
                    </thead>
                    <tbody>
                        {days.map((day) => {
                            const dateObj = new Date(day.date);
                            const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

                            return (
                                <tr
                                    key={day.date}
                                    className={`border-b hover:bg-gray-50 ${isWeekend ? 'bg-blue-50/30' : ''
                                        }`}
                                >
                                    <td className="px-4 py-2">
                                        <div>
                                            {dateObj.toLocaleDateString('pt-BR', {
                                                day: '2-digit',
                                                month: '2-digit'
                                            })}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {dateObj.toLocaleDateString('pt-BR', { weekday: 'short' })}
                                        </div>
                                    </td>
                                    <td
                                        className={`px-4 py-2 text-center cursor-pointer ${getAvailabilityColor(
                                            day.available,
                                            day.total
                                        )}`}
                                        onClick={() => handleCellClick(day.date, 'available', day.available)}
                                    >
                                        {editingCell?.date === day.date && editingCell?.field === 'available' ? (
                                            <input
                                                type="number"
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onBlur={handleCellBlur}
                                                onKeyDown={(e) => e.key === 'Enter' && handleCellBlur()}
                                                autoFocus
                                                className="w-16 px-2 py-1 text-center border rounded"
                                            />
                                        ) : (
                                            `${day.available}/${day.total}`
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-center text-gray-600">
                                        {day.total}
                                    </td>
                                    <td
                                        className="px-4 py-2 text-right cursor-pointer hover:bg-blue-50"
                                        onClick={() => handleCellClick(day.date, 'rate', day.rate)}
                                    >
                                        {editingCell?.date === day.date && editingCell?.field === 'rate' ? (
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onBlur={handleCellBlur}
                                                onKeyDown={(e) => e.key === 'Enter' && handleCellBlur()}
                                                autoFocus
                                                className="w-20 px-2 py-1 text-right border rounded"
                                            />
                                        ) : day.rate ? (
                                            `$${day.rate.toFixed(2)}`
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        {day.restrictions.minLOS ?? '-'}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        {day.restrictions.closedToArrival ? '✓' : '-'}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        {day.restrictions.closedToDeparture ? '✓' : '-'}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        {day.restrictions.closed ? (
                                            <span className="text-red-600 font-semibold">✕</span>
                                        ) : (
                                            '-'
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {days.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    Nenhum dado disponível para este período
                </div>
            )}
        </div>
    );
}
