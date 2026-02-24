"use client"

import { NeoCard, NeoCardHeader, NeoCardTitle, NeoCardContent } from "@/components/neo/neo-card"
import { NeoInput } from "@/components/neo/neo-input"
import { NeoButton } from "@/components/neo/neo-button"
import { DatePicker } from "@/components/ui/date-picker" // Assuming we have a date picker or will wrap one
import { addDays, differenceInCalendarDays, format } from "date-fns"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface BookingContextBlockProps {
    checkIn: Date | undefined
    checkOut: Date | undefined
    checkInTime: string
    checkOutTime: string
    onDatesChange: (start: Date | undefined, end: Date | undefined) => void
    onTimesChange: (field: 'checkInTime' | 'checkOutTime', value: string) => void
    status: string
}

export function BookingContextBlock({
    checkIn,
    checkOut,
    checkInTime,
    checkOutTime,
    onDatesChange,
    onTimesChange,
    status
}: BookingContextBlockProps) {
    const nights = checkIn && checkOut ? differenceInCalendarDays(checkOut, checkIn) : 0

    return (
        <NeoCard className="h-full">
            <NeoCardHeader className="pb-3 border-b border-white/5">
                <NeoCardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex justify-between items-center">
                    <span>Block 1: Reservation Context</span>
                    <span className={cn(
                        "px-2 py-0.5 text-[10px] font-bold rounded-sm uppercase",
                        status === 'CONFIRMED' ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                        {status}
                    </span>
                </NeoCardTitle>
            </NeoCardHeader>
            <NeoCardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    {/* Check-in group */}
                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground">Check-in Date</label>
                            <input
                                type="date"
                                className="flex h-9 w-full rounded-none border border-input bg-background/50 px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                value={checkIn ? format(checkIn, 'yyyy-MM-dd') : ''}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (!val) {
                                        onDatesChange(undefined, checkOut);
                                        return;
                                    }
                                    const newDate = new Date(val + 'T12:00:00');
                                    onDatesChange(newDate, checkOut);
                                }}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground">Check-in Time</label>
                            <input
                                type="time"
                                className="flex h-9 w-full rounded-none border border-input bg-background/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={checkInTime}
                                onChange={(e) => onTimesChange('checkInTime', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Check-out group */}
                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground">Check-out Date</label>
                            <input
                                type="date"
                                className="flex h-9 w-full rounded-none border border-input bg-background/50 px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                value={checkOut ? format(checkOut, 'yyyy-MM-dd') : ''}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (!val) {
                                        onDatesChange(checkIn, undefined);
                                        return;
                                    }
                                    const newDate = new Date(val + 'T12:00:00');
                                    onDatesChange(checkIn, newDate);
                                }}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground">Check-out Time</label>
                            <input
                                type="time"
                                className="flex h-9 w-full rounded-none border border-input bg-background/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={checkOutTime}
                                onChange={(e) => onTimesChange('checkOutTime', e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-secondary/50 border border-border/50">
                    <span className="text-xs font-mono text-muted-foreground uppercase">Duration</span>
                    <span className="text-xl font-bold font-heading text-foreground">
                        {nights} <span className="text-sm font-normal text-muted-foreground">nights</span>
                    </span>
                </div>
            </NeoCardContent>
        </NeoCard>
    )
}
