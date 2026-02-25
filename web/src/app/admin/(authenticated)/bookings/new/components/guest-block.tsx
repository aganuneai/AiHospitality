"use client"

import { NeoCard, NeoCardHeader, NeoCardTitle, NeoCardContent } from "@/components/neo/neo-card"
import { NeoInput } from "@/components/neo/neo-input"
import { User, Search, Loader2 } from "lucide-react"
import { useGuestSearch } from "@/hooks/use-guest-search"
import { useState, useEffect } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandItem, CommandGroup, CommandEmpty } from "@/components/ui/command"
import { format } from "date-fns"

interface GuestBlockProps {
    holderName: string
    holderEmail: string
    holderPhone: string
    holderDoc: string
    onChange: (field: string, value: string) => void
}

export function GuestBlock({ holderName, holderEmail, holderPhone, holderDoc, onChange }: GuestBlockProps) {
    const { query, setQuery, results, isLoading } = useGuestSearch()
    const [open, setOpen] = useState(false)

    // Handle selection from search
    const handleSelect = (guest: any) => {
        onChange('holderName', guest.fullName || `${guest.firstName} ${guest.lastName}`)
        onChange('holderEmail', guest.email)
        onChange('holderPhone', guest.phone || '')
        onChange('holderDoc', guest.documentId || '')
        setOpen(false)
        setQuery('') // Reset search but keep selected values
    }

    return (
        <NeoCard className="bg-muted/30">
            <NeoCardHeader className="pb-3 border-b border-white/5 flex flex-row items-center justify-between">
                <NeoCardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <User className="w-3 h-3 text-primary" />
                    Block 3: Guest Information
                </NeoCardTitle>


                {/* Guest Search Popover */}
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <button className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
                            <Search className="w-3 h-3" />
                            <span className="font-mono uppercase tracking-wide">Lookup Guest</span>
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[400px]" align="end">
                        <Command shouldFilter={false}> {/* We handle filtering via API */}
                            <CommandInput
                                placeholder="Search by name, email or doc..."
                                value={query}
                                onValueChange={setQuery}
                            />
                            <CommandList>
                                {isLoading && (
                                    <div className="flex items-center justify-center p-4 text-xs text-muted-foreground">
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Searching CRM...
                                    </div>
                                )}
                                {!isLoading && results.length === 0 && query.length > 2 && (
                                    <CommandEmpty className="py-6 text-center text-xs text-muted-foreground">
                                        No guests found. Start typing to search.
                                    </CommandEmpty>
                                )}

                                {results.length > 0 && (
                                    <CommandGroup heading="Recent Guests">
                                        {results.map((guest: any) => (
                                            <CommandItem
                                                key={guest.id}
                                                value={guest.id}
                                                onSelect={() => handleSelect(guest)}
                                                onPointerDown={(e) => {
                                                    e.preventDefault()
                                                    handleSelect(guest)
                                                }}
                                                className="flex flex-col items-start gap-1 cursor-pointer p-3 rounded-lg hover:bg-primary/5 transition-colors"
                                            >
                                                <div className="flex items-center justify-between w-full">
                                                    <span className="font-black text-sm">{guest.fullName || `${guest.firstName} ${guest.lastName}`}</span>
                                                    {guest.documentId && (
                                                        <span className="text-[10px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-widest">
                                                            {guest.documentType || 'DOC'}: {guest.documentId}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground flex items-center gap-3 opacity-70">
                                                    <span className="truncate max-w-[150px]">{guest.email}</span>
                                                    {guest.phone && <span>• {guest.phone}</span>}
                                                </div>
                                                {guest.lastUpdated && (
                                                    <div className="text-[8px] uppercase tracking-tighter opacity-30 mt-1">
                                                        Last_Active: {new Date(guest.lastUpdated).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                )}
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>


            </NeoCardHeader>
            <NeoCardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Full Name *</label>
                        <NeoInput
                            placeholder="Guest Name"
                            value={holderName || ''}
                            onChange={(e) => onChange('holderName', e.target.value)}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Email Address *</label>
                        <NeoInput
                            placeholder="alerts@example.com"
                            type="email"
                            value={holderEmail}
                            onChange={(e) => onChange('holderEmail', e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Phone Number</label>
                        <NeoInput
                            placeholder="+55 (11) 99999-9999"
                            value={holderPhone}
                            onChange={(e) => onChange('holderPhone', e.target.value)}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Document ID (CPF/Passport)</label>
                        <NeoInput
                            placeholder="000.000.000-00"
                            value={holderDoc}
                            onChange={(e) => onChange('holderDoc', e.target.value)}
                        />
                    </div>
                </div>
            </NeoCardContent>
        </NeoCard>
    )
}
