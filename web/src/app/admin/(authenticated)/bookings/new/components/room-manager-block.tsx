"use client"

import { NeoCard, NeoCardHeader, NeoCardTitle, NeoCardContent } from "@/components/neo/neo-card"
import { NeoButton } from "@/components/neo/neo-button"
import { Plus, Copy, Trash2, Users } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

export interface RoomRequest {
    id: string
    roomTypeId: string
    adults: number
    children: number
    ratePlanId: string
    status: 'PENDING' | 'CONFIRMED' | 'ERROR'
}

interface RoomManagerBlockProps {
    rooms: RoomRequest[]
    availability: any[]
    inventoryLoading?: boolean
    onAddRoom: () => void
    onRemoveRoom: (id: string) => void
    onDuplicateRoom: (room: RoomRequest) => void
    onUpdateRoom: (id: string, field: keyof RoomRequest, value: any) => void
    quotes?: any[]
}

export function RoomManagerBlock({
    rooms,
    availability = [],
    inventoryLoading,
    onAddRoom,
    onRemoveRoom,
    onDuplicateRoom,
    onUpdateRoom,
    quotes = []
}: RoomManagerBlockProps) {
    console.log("RoomManagerBlock Rendered", { rooms, availability })
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    Block 4 & 5: Inventory & Occupants
                    <Badge variant="outline" className="text-[10px] h-5 bg-primary/10 text-primary border-primary/20">
                        {rooms.length} Units
                    </Badge>
                </h3>
                <NeoButton size="sm" onClick={onAddRoom} className="h-7 text-xs">
                    <Plus className="w-3 h-3 mr-1" /> Add UH
                </NeoButton>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {rooms.map((room, index) => (
                    <NeoCard key={room.id} className="relative group overflow-hidden border-l-4 border-l-primary/50">
                        <div className="absolute top-2 right-2 flex gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                            <NeoButton variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDuplicateRoom(room)}>
                                <Copy className="w-3 h-3" />
                            </NeoButton>
                            {rooms.length > 1 && (
                                <NeoButton variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => onRemoveRoom(room.id)}>
                                    <Trash2 className="w-3 h-3" />
                                </NeoButton>
                            )}
                        </div>

                        <NeoCardContent className="pt-4 pb-4 pl-4 pr-10">
                            <div className="grid grid-cols-12 gap-4 items-center">
                                {/* Unit Type */}
                                <div className="col-span-4 space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Room Type <span className="text-red-500">*</span></label>
                                    <Select
                                        value={room.roomTypeId || undefined}
                                        onValueChange={(v) => onUpdateRoom(room.id, 'roomTypeId', v)}
                                        disabled={inventoryLoading}
                                    >
                                        <SelectTrigger className="h-8 text-xs bg-background/50 overflow-hidden [&>span>div>div:last-child]:opacity-0 [&>span>div>div:last-child]:hidden [&>span>div]:min-w-0">
                                            <SelectValue placeholder={inventoryLoading ? "Loading Inventory..." : "Select Room Type..."} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availability.map(item => {
                                                const isSoldOut = !item.available || item.roomsAvailable === 0
                                                const isLow = item.roomsAvailable > 0 && item.roomsAvailable < 3
                                                return (
                                                    <SelectItem
                                                        key={item.roomTypeCode}
                                                        value={item.roomTypeCode}
                                                        disabled={isSoldOut}
                                                        className="py-2"
                                                    >
                                                        <div className="flex items-center justify-between w-full min-w-[240px] gap-4">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold">{item.roomTypeName}</span>
                                                                <span className="text-[10px] text-muted-foreground uppercase">{item.roomTypeCode}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono font-bold text-primary">
                                                                    ${Number(item.pricePerNight || 0).toFixed(2)}
                                                                </span>
                                                                <Badge
                                                                    variant={isSoldOut ? "destructive" : isLow ? "default" : "outline"}
                                                                    className={`text-[9px] px-1 h-4 ${isLow ? 'bg-amber-500 text-white border-none' : ''}`}
                                                                >
                                                                    {isSoldOut ? "SOLD OUT" : `${item.roomsAvailable} LFT`}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </SelectItem>
                                                )
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Occupancy */}
                                <div className="col-span-3 space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                                        <Users className="w-3 h-3" /> Pax
                                    </label>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <input
                                                type="number"
                                                min={1}
                                                className="w-full h-8 px-2 text-xs bg-background/50 border border-input text-center rounded-none focus:outline-none focus:ring-1 focus:ring-primary"
                                                value={room.adults}
                                                onChange={(e) => onUpdateRoom(room.id, 'adults', parseInt(e.target.value))}
                                            />
                                            <span className="text-[9px] text-muted-foreground block text-center mt-0.5">Adt</span>
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                type="number"
                                                min={0}
                                                className="w-full h-8 px-2 text-xs bg-background/50 border border-input text-center rounded-none focus:outline-none focus:ring-1 focus:ring-primary"
                                                value={room.children}
                                                onChange={(e) => onUpdateRoom(room.id, 'children', parseInt(e.target.value))}
                                            />
                                            <span className="text-[9px] text-muted-foreground block text-center mt-0.5">Chd</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Rate Plan */}
                                <div className="col-span-3 space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Rate Plan</label>
                                    <Select value={room.ratePlanId} onValueChange={(v) => onUpdateRoom(room.id, 'ratePlanId', v)}>
                                        <SelectTrigger className="h-8 text-xs bg-background/50">
                                            <SelectValue placeholder="Select Rate" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="BAR">Best Available</SelectItem>
                                            <SelectItem value="PROMO">Summer Promo</SelectItem>
                                            <SelectItem value="CORP">Corporate Flat</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Status/Price Preview */}
                                <div className="col-span-2 flex flex-col items-end justify-center h-full pt-4">
                                    <span className="text-xs font-bold text-foreground">
                                        $ {Number(quotes.find(q => q.roomTypeCode === room.roomTypeId)?.total || 0).toFixed(2)}
                                    </span>
                                    {room.children > 0 && <span className="text-[9px] text-amber-500 font-bold">Check Ages</span>}
                                </div>
                            </div>
                        </NeoCardContent>
                    </NeoCard>
                ))}
            </div>
        </div>
    )
}
