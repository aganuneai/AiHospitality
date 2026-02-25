"use client"

import { useState, useEffect, useMemo } from "react"
import { NeoButton } from "@/components/neo/neo-button"
import { NeoCard } from "@/components/neo/neo-card"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, ZoomIn, ZoomOut } from "lucide-react"
import { addDays, format, startOfWeek, differenceInDays, isSameDay, isWithinInterval } from "date-fns"
import { cn } from "@/lib/utils"

// Helpers
const CELL_WIDTH = 60 // px per day
const ROW_HEIGHT = 48 // px per room

interface GridData {
    rooms: any[]
    bookings: any[]
}

export default function GridPage() {
    const [startDate, setStartDate] = useState(startOfWeek(new Date()))
    const [daysToShow, setDaysToShow] = useState(21) // 3 Weeks view
    const [data, setData] = useState<GridData>({ rooms: [], bookings: [] })
    const [loading, setLoading] = useState(true)

    // Derived dates
    const endDate = addDays(startDate, daysToShow)
    const dates = useMemo(() => {
        return Array.from({ length: daysToShow }, (_, i) => addDays(startDate, i))
    }, [startDate, daysToShow])

    // Fetch Data
    useEffect(() => {
        const fetchGrid = async () => {
            setLoading(true)
            try {
                const params = new URLSearchParams({
                    start: startDate.toISOString(),
                    end: endDate.toISOString()
                })
                const res = await fetch(`/api/v1/admin/grid?${params}`)
                const json = await res.json()
                if (res.ok) setData(json)
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        fetchGrid()
    }, [startDate, daysToShow]) // Re-fetch when range changes

    // Handlers
    const handlePrev = () => setStartDate(addDays(startDate, -7))
    const handleNext = () => setStartDate(addDays(startDate, 7))

    return (
        <div className="flex flex-col h-full overflow-hidden bg-background">
            {/* 1. Toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-border/50 bg-card/10 glass z-20">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold font-heading">Tape Chart</h1>
                    <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-md">
                        <NeoButton variant="ghost" size="icon" onClick={handlePrev} className="h-7 w-7"><ChevronLeft className="w-4 h-4" /></NeoButton>
                        <span className="text-xs font-mono font-bold px-2 min-w-[120px] text-center">
                            {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
                        </span>
                        <NeoButton variant="ghost" size="icon" onClick={handleNext} className="h-7 w-7"><ChevronRight className="w-4 h-4" /></NeoButton>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <NeoButton variant="outline" size="sm" className="gap-2"><Filter className="w-3 h-3" /> Filter</NeoButton>
                    <NeoButton variant="outline" size="sm" className="gap-2"><CalendarIcon className="w-3 h-3" /> Today</NeoButton>
                    <div className="h-4 w-px bg-border/50 mx-2" />
                    <NeoButton size="sm" className="bg-primary text-primary-foreground">New Reservation</NeoButton>
                </div>
            </div>

            {/* 2. Main Grid Container */}
            <div className="flex-1 overflow-auto relative flex">

                {/* A. Sidebar (Room Names) - Sticky Left */}
                <div className="w-48 flex-shrink-0 sticky left-0 z-20 bg-background border-r border-border/50 shadow-lg">
                    {/* Header Placeholder */}
                    <div className="h-12 border-b border-border/50 bg-muted/20 flex items-center px-4 font-bold text-xs text-muted-foreground uppercase tracking-wider">
                        Rooms
                    </div>
                    {/* Room Rows */}
                    <div className="divide-y divide-border/20">
                        {data.rooms.map(room => (
                            <div key={room.id} style={{ height: ROW_HEIGHT }} className="flex flex-col justify-center px-4 hover:bg-muted/10 transition-colors group">
                                <span className="font-bold text-sm text-foreground">{room.name}</span>
                                <span className="text-[10px] text-muted-foreground">{room.type}</span>
                            </div>
                        ))}
                        {/* Unassigned Row */}
                        <div style={{ height: ROW_HEIGHT }} className="flex flex-col justify-center px-4 bg-stripes-warning opacity-80">
                            <span className="font-bold text-sm text-amber-500">Unassigned</span>
                        </div>
                    </div>
                </div>

                {/* B. Timeline Canvas */}
                <div className="flex-1 min-w-0 overflow-x-auto">
                    <div style={{ width: daysToShow * CELL_WIDTH, minWidth: '100%' }}>

                        {/* Timeline Header - Sticky Top */}
                        <div className="h-12 border-b border-border/50 flex sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
                            {dates.map(date => {
                                const isWeekend = date.getDay() === 0 || date.getDay() === 6
                                return (
                                    <div
                                        key={date.toISOString()}
                                        style={{ width: CELL_WIDTH }}
                                        className={cn(
                                            "flex flex-col items-center justify-center border-r border-border/20 text-xs",
                                            isWeekend && "bg-muted/10",
                                            isSameDay(date, new Date()) && "bg-primary/5 text-primary font-bold"
                                        )}
                                    >
                                        <span className="opacity-50 text-[10px] uppercase">{format(date, 'EEE')}</span>
                                        <span className="font-bold">{format(date, 'd')}</span>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Grid Body */}
                        <div className="relative">

                            {/* Background Grid Lines */}
                            <div className="absolute inset-0 flex pointer-events-none">
                                {dates.map(date => (
                                    <div
                                        key={date.toISOString()}
                                        style={{ width: CELL_WIDTH }}
                                        className="border-r border-border/10 h-full"
                                    />
                                ))}
                            </div>

                            {/* Room Rows (for alignment) */}
                            {data.rooms.map(room => (
                                <div key={room.id} style={{ height: ROW_HEIGHT }} className="border-b border-border/10 relative group">
                                    {/* Bookings for this room */}
                                    {data.bookings
                                        .filter(b => b.roomId === room.id)
                                        .map(booking => {
                                            // Calculate Position
                                            const start = new Date(booking.checkIn)
                                            const end = new Date(booking.checkOut)

                                            // Clip start/end to view range
                                            const viewStart = startDate
                                            const offsetDays = differenceInDays(start, viewStart)
                                            const durationDays = differenceInDays(end, start)

                                            // CSS Positioning
                                            const left = offsetDays * CELL_WIDTH
                                            const width = durationDays * CELL_WIDTH

                                            // Hide if out of view (left + width < 0)
                                            if (left + width <= 0) return null

                                            return (
                                                <div
                                                    key={booking.id}
                                                    className={cn(
                                                        "absolute top-1 bottom-1 rounded-sm shadow-sm border text-[10px] font-medium flex items-center px-2 overflow-hidden whitespace-nowrap cursor-pointer hover:brightness-110 hover:scale-[1.01] transition-all z-10",
                                                        booking.status === 'CONFIRMED' ? "bg-primary/20 border-primary/40 text-primary-foreground" : "bg-muted border-muted-foreground/30 text-muted-foreground"
                                                    )}
                                                    style={{
                                                        left: Math.max(0, left), // Clamp left
                                                        width: Math.max(CELL_WIDTH / 2, width - (left < 0 ? Math.abs(left) : 0)), // Adjust width if clipped
                                                    }}
                                                    title={`${booking.guestName} (${booking.status})`}
                                                >
                                                    {booking.guestName}
                                                </div>
                                            )
                                        })
                                    }
                                </div>
                            ))}

                            {/* Unassigned Area */}
                            <div style={{ height: ROW_HEIGHT }} className="border-b border-border/10 relative bg-amber-500/5">
                                {data.bookings
                                    .filter(b => b.roomId === 'UNASSIGNED')
                                    .map(booking => {
                                        // Same logic... simplified for copy-paste
                                        const start = new Date(booking.checkIn)
                                        const end = new Date(booking.checkOut)
                                        const offsetDays = differenceInDays(start, startDate)
                                        const durationDays = differenceInDays(end, start)
                                        const left = offsetDays * CELL_WIDTH
                                        const width = durationDays * CELL_WIDTH

                                        return (
                                            <div
                                                key={booking.id}
                                                className="absolute top-1 bottom-1 rounded-sm border border-amber-500/50 bg-amber-500/20 text-amber-200 text-[10px] flex items-center px-2 overflow-hidden whitespace-nowrap"
                                                style={{ left, width }}
                                            >
                                                ? {booking.guestName}
                                            </div>
                                        )
                                    })
                                }
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
