import { prisma } from '@/lib/db';
import { AriGridResponse, AriGridRow, AriCalendarDay } from '@/lib/types/ari';
import { eachDayOfInterval, format, parseISO, getDay } from 'date-fns';

/**
 * Service for ARI (Availability, Rates, and Inventory) grid operations.
 * Provides optimized methods for matrix data resolution and bulk management.
 */
export class AriService {
    /**
     * Fetches grid-ready data for all room types in a property for a given date range.
     * 
     * @param hotelId The property ID
     * @param from Start date
     * @param to End date
     */
    async getGridData(hotelId: string, from: Date, to: Date, roomTypeIds?: string[], ratePlanCodes?: string[]): Promise<AriGridResponse> {
        // 1. Get all room types for the property (filtered if specified)
        const roomTypeWhere: any = { propertyId: hotelId };
        if (roomTypeIds && roomTypeIds.length > 0) {
            roomTypeWhere.id = { in: roomTypeIds };
        }

        const roomTypes = await prisma.roomType.findMany({
            where: roomTypeWhere,
            orderBy: { code: 'asc' }
        });

        // 2. Generate date range
        const dates = eachDayOfInterval({ start: from, end: to });

        // 3. Fetch all inventory, rates, restrictions and rate plans for the property and date range in bulk
        const inventory = await prisma.inventory.findMany({
            where: {
                propertyId: hotelId,
                date: { gte: from, lte: to }
            }
        });

        const restrictions = await prisma.restriction.findMany({
            where: {
                propertyId: hotelId,
                date: { gte: from, lte: to }
            }
        });

        const rates = await prisma.rate.findMany({
            where: {
                propertyId: hotelId,
                date: { gte: from, lte: to }
            }
        });

        const ratePlans = await prisma.ratePlan.findMany({
            where: { propertyId: hotelId }
        });

        // 4. Create lookup maps for efficiency
        const inventoryMap = new Map();
        inventory.forEach(inv => {
            const key = `${inv.roomTypeId}_${inv.date.toISOString().split('T')[0]}`;
            inventoryMap.set(key, inv);
        });

        const restrictionMap = new Map();
        restrictions.forEach((res: any) => {
            // Note the new ratePlanCode in the key
            const key = `${res.roomTypeId}_${res.ratePlanCode}_${res.date.toISOString().split('T')[0]}`;
            restrictionMap.set(key, res);
        });

        const rateMap = new Map();
        rates.forEach(rate => {
            const key = `${rate.roomTypeId}_${rate.ratePlanCode}_${rate.date.toISOString().split('T')[0]}`;
            rateMap.set(key, rate);
        });

        const ratePlansMap = new Map();
        ratePlans.forEach(rp => ratePlansMap.set(rp.id, rp));

        // Helper to resolve price on-the-fly if missing (Derived logic)
        const resolvePrice = (rtId: string, rp: any, dateStr: string): number | null => {
            const key = `${rtId}_${rp.code}_${dateStr}`;
            const existing = rateMap.get(key);

            if (existing?.amount != null) return Number(existing.amount);

            // Fallback to derivation
            if (rp.parentRatePlanId) {
                const parent = ratePlansMap.get(rp.parentRatePlanId);
                if (!parent) return null;

                const parentPrice = resolvePrice(rtId, parent, dateStr);
                if (parentPrice === null) return null;

                let calculated = parentPrice;
                if (rp.derivedType === 'PERCENTAGE') {
                    calculated = parentPrice * (1 + (Number(rp.derivedValue) / 100));
                } else if (rp.derivedType === 'FIXED_AMOUNT') {
                    calculated = parentPrice + Number(rp.derivedValue);
                }

                // Apply rounding
                if (rp.roundingRule && rp.roundingRule !== 'NONE') {
                    return this.applyRounding(calculated, rp.roundingRule);
                }
                return calculated;
            }

            return null;
        };

        // 5. Build grid rows assembling the matrix
        const rows: AriGridRow[] = roomTypes.map(rt => {
            // 5a. Build Top Level Inventory Line (Days)
            const inventoryDays = dates.map(date => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const key = `${rt.id}_${dateStr}`;
                const inv = inventoryMap.get(key);

                return {
                    date: dateStr,
                    available: inv?.available ?? 0,
                    total: inv?.total ?? 0,
                };
            });

            // 5b. Determine which Rate Plans to show
            let activeRatePlanCodes: string[] = [];

            if (ratePlanCodes && ratePlanCodes.length > 0) {
                activeRatePlanCodes = [...ratePlanCodes];
            } else {
                activeRatePlanCodes = ratePlans.length > 0 ? ratePlans.map(rp => rp.code) : ['BASE'];
            }

            const rateLines = activeRatePlanCodes.map(rpc => {
                const rp = ratePlans.find(rp => rp.code === rpc);
                const ratePlanName = rp?.name || rpc;

                const days: AriCalendarDay[] = dates.map(date => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const key = `${rt.id}_${rpc}_${dateStr}`;

                    const dbRate = rateMap.get(key);
                    const res = restrictionMap.get(key) || restrictionMap.get(`${rt.id}_BASE_${dateStr}`);

                    // Use resolvePrice for clever derivation fallback
                    const price = rp ? resolvePrice(rt.id, rp, dateStr) : null;

                    return {
                        date: dateStr,
                        available: 0,
                        total: 0,
                        rate: price,
                        restrictions: {
                            minLOS: res?.minLOS ?? null,
                            maxLOS: res?.maxLOS ?? null,
                            closedToArrival: res?.closedToArrival ?? false,
                            closedToDeparture: res?.closedToDeparture ?? false,
                            closed: res?.closed ?? false
                        },
                        isManualOverride: dbRate?.isManualOverride ?? false
                    };
                });

                return {
                    ratePlanCode: rpc,
                    ratePlanName,
                    parentRatePlanId: rp?.parentRatePlanId || null,
                    days
                };
            });

            return {
                roomTypeId: rt.id,
                roomTypeCode: rt.code,
                roomTypeName: rt.name,
                inventoryDays,
                rateLines
            };
        });

        // 6. Calculate Property-wide Summary & Fetch Events
        let eventsRaw: any[] = [];
        try {
            if ((prisma as any).calendarEvent) {
                eventsRaw = await (prisma as any).calendarEvent.findMany({
                    where: {
                        OR: [
                            { propertyId: hotelId },
                            { propertyId: null }
                        ],
                        date: { gte: from, lte: to }
                    },
                    orderBy: { date: 'asc' }
                });
            } else {
                // Fallback to Raw Query if Prisma Client is not updated
                eventsRaw = await prisma.$queryRaw`
                    SELECT id, date, title, type, color, description 
                    FROM "CalendarEvent" 
                    WHERE ("propertyId" = ${hotelId} OR "propertyId" IS NULL) 
                    AND "date" >= ${from}::date 
                    AND "date" <= ${to}::date 
                    ORDER BY "date" ASC
                `;
            }
        } catch (e) {
            console.error("CalendarEvent fetch failed, using empty array", e);
            eventsRaw = [];
        }

        const events = eventsRaw.map(e => ({
            id: e.id,
            date: typeof e.date === 'string' ? e.date : format(e.date, 'yyyy-MM-dd'),
            title: e.title,
            type: e.type,
            color: e.color,
            description: e.description
        }));

        const summary: any[] = dates.map(date => {
            const dateStr = format(date, 'yyyy-MM-dd');
            let totalInventory = 0;
            let totalAvailable = 0;

            rows.forEach(row => {
                const day = row.inventoryDays.find(d => d.date === dateStr);
                if (day) {
                    totalInventory += day.total;
                    totalAvailable += day.available;
                }
            });

            const occupancyPct = totalInventory > 0 ? ((totalInventory - totalAvailable) / totalInventory) * 100 : 0;

            return {
                date: dateStr,
                totalInventory,
                totalAvailable,
                occupancyPct
            };
        });

        return {
            dateRange: {
                from: format(from, 'yyyy-MM-dd'),
                to: format(to, 'yyyy-MM-dd')
            },
            rows,
            summary,
            events
        };
    }

    /**
     * Bulk updates ARI data for multiple room types and a specific date range.
     * Guarantees atomicity via a Prisma transaction.
     * 
     * @param hotelId The property ID
     * @param params Validated bulk update request parameters
     */
    async updateBulk(hotelId: string, params: import('@/lib/schemas/ari/bulk-update.schema').BulkUpdateRequest): Promise<{ message: string, warnings?: string[] }> {
        const from = parseISO(params.fromDate);
        const to = parseISO(params.toDate);
        let localDates = eachDayOfInterval({ start: from, end: to });

        if (params.daysOfWeek && params.daysOfWeek.length > 0) {
            localDates = localDates.filter(d => params.daysOfWeek!.includes(getDay(d)));
        }

        // Force exactly T00:00:00Z to avoid Node timezone drifting on the database side
        const dates = localDates.map(d => new Date(format(d, 'yyyy-MM-dd') + 'T00:00:00Z'));

        // Build data objects for updateMany
        const invData: any = {};
        if (params.fields.available !== undefined) invData.available = params.fields.available;

        const rateData: any = {};
        if (params.fields.price !== undefined) rateData.amount = params.fields.price;

        const resData: any = {};
        if (params.fields.minLOS !== undefined) resData.minLOS = params.fields.minLOS;
        if (params.fields.maxLOS !== undefined) resData.maxLOS = params.fields.maxLOS;
        if (params.fields.closedToArrival !== undefined) resData.closedToArrival = params.fields.closedToArrival;
        if (params.fields.closedToDeparture !== undefined) resData.closedToDeparture = params.fields.closedToDeparture;
        if (params.fields.closed !== undefined) resData.closed = params.fields.closed;

        // Perform transactional bulk upsert and update
        const warnings: string[] = [];

        await prisma.$transaction(async (tx) => {
            // 0. HARD-CAP OVERBOOKING PROTECTION
            // Fetch physical room counts for all involved room types beforehand
            const physicalCounts: Record<string, number> = {};
            const roomTypes = await tx.roomType.findMany({
                where: { id: { in: params.roomTypeIds } },
                select: { id: true, code: true }
            });

            for (const rtId of params.roomTypeIds) {
                const count = await tx.room.count({
                    where: {
                        roomTypeId: rtId,
                        status: { not: 'OOO' }
                    }
                });
                physicalCounts[rtId] = count;
            }

            // 1. Ensure records exist for the given dates to allow bulk updating safely.
            const newInventories = [];
            const newRestrictions = [];
            const newRates = [];

            const rpc = (params as any).ratePlanCode || 'BASE';

            for (const rtId of params.roomTypeIds) {
                const physicalCount = physicalCounts[rtId] || 0;
                // If applying availability, constrain it per room type's actual limit
                let safeAvailable = 0;
                if (params.fields.available !== undefined) {
                    const reqAvail = Number(params.fields.available);
                    safeAvailable = Math.min(reqAvail, physicalCount);

                    if (reqAvail > physicalCount) {
                        const rt = await tx.roomType.findUnique({ where: { id: rtId }, select: { name: true } });
                        const warningMsg = `O limite de ${physicalCount} quartos para '${rt?.name || rtId}' foi aplicado (solicitado: ${reqAvail}).`;
                        if (!warnings.includes(warningMsg)) warnings.push(warningMsg);
                    }
                }

                for (const d of dates) {
                    newInventories.push({
                        propertyId: hotelId,
                        roomTypeId: rtId,
                        date: d,
                        total: physicalCount, // Lock total to reality
                        available: safeAvailable,
                        price: 0
                    });
                    newRestrictions.push({
                        propertyId: hotelId,
                        roomTypeId: rtId,
                        date: d,
                        ratePlanCode: rpc
                    });
                    newRates.push({
                        propertyId: hotelId,
                        roomTypeId: rtId,
                        date: d,
                        ratePlanCode: rpc,
                        amount: 0
                    });
                }
            }

            // skipDuplicates prevents errors if the rows already exist, ensuring we have rows to update
            await tx.inventory.createMany({
                data: newInventories,
                skipDuplicates: true
            });

            await tx.restriction.createMany({
                data: newRestrictions,
                skipDuplicates: true
            });

            await tx.rate.createMany({
                data: newRates,
                skipDuplicates: true
            });

            // 2. Execute bulk updates for the matched criteria

            if (Object.keys(invData).length > 0) {
                // Fetch current values for fallback/undo
                const currentInventories = await tx.inventory.findMany({
                    where: {
                        propertyId: hotelId,
                        roomTypeId: { in: params.roomTypeIds },
                        date: { in: dates }
                    }
                });

                for (const rtId of params.roomTypeIds) {
                    const physicalCount = physicalCounts[rtId] || 0;
                    const requestedAvailable = params.fields.available !== undefined ? Number(params.fields.available) : 0;
                    const safeAvailable = Math.min(requestedAvailable, physicalCount);

                    await tx.inventory.updateMany({
                        where: {
                            propertyId: hotelId,
                            roomTypeId: rtId,
                            date: { in: dates }
                        },
                        data: {
                            available: safeAvailable,
                            total: physicalCount // Enforce hardware limit
                        }
                    });
                }
                // Store previous values in one of the events or a shared one (simplified: in each RT event)
                (params as any)._prevInventories = currentInventories;
            }

            if (Object.keys(rateData).length > 0) {
                const currentRates = await tx.rate.findMany({
                    where: {
                        propertyId: hotelId,
                        roomTypeId: { in: params.roomTypeIds },
                        ratePlanCode: rpc,
                        date: { in: dates }
                    }
                });

                await tx.rate.updateMany({
                    where: {
                        propertyId: hotelId,
                        roomTypeId: { in: params.roomTypeIds },
                        ratePlanCode: rpc,
                        date: { in: dates }
                    },
                    data: { ...rateData, isManualOverride: true } as any
                });
                (params as any)._prevRates = currentRates;

                // --- NEW: Derived Rates Logic ---
                // If we updated a rate, check if this RatePlan has children (Derived Rates)
                const parentRatePlan = await (tx as any).ratePlan.findUnique({
                    where: {
                        propertyId_code: {
                            propertyId: hotelId,
                            code: rpc
                        }
                    },
                    include: {
                        derivedRatePlans: true
                    }
                });

                if (parentRatePlan && parentRatePlan.derivedRatePlans.length > 0) {
                    for (const child of parentRatePlan.derivedRatePlans) {
                        if (!child.derivedType || child.derivedValue === null) continue;

                        // Calculate the new derived rate using the parent's new amount
                        const parentAmount = Number(rateData.amount);
                        let childAmount = parentAmount;

                        if (child.derivedType === 'PERCENTAGE') {
                            const discount = parentAmount * (Number(child.derivedValue) / 100);
                            childAmount = parentAmount + discount; // The value can be negative to discount
                        } else if (child.derivedType === 'FIXED_AMOUNT') {
                            childAmount = parentAmount + Number(child.derivedValue);
                        }

                        // Apply RM rounding if configured
                        const rule = (child as any).roundingRule || 'NONE';
                        const roundedAmount = this.applyRounding(childAmount, rule);
                        const calcDetails = `${parentAmount} ${child.derivedType === 'PERCENTAGE' ? (Number(child.derivedValue) >= 0 ? '+' : '') + child.derivedValue + '%' : (Number(child.derivedValue) >= 0 ? '+' : '') + child.derivedValue} = ${childAmount.toFixed(2)} (Round: ${rule} -> ${roundedAmount})`;

                        // Prevent negative rates
                        if (roundedAmount < 0) childAmount = 0;
                        else childAmount = roundedAmount;

                        // Create rates for derived plans to ensure they exist before updating
                        const newDerivedRates = [];
                        for (const rtId of params.roomTypeIds) {
                            for (const d of dates) {
                                newDerivedRates.push({
                                    propertyId: hotelId,
                                    roomTypeId: rtId,
                                    date: d,
                                    ratePlanCode: child.code,
                                    amount: childAmount,
                                    isManualOverride: false // Derived updates are not manual
                                });
                            }
                        }

                        // Create if not exists
                        await tx.rate.createMany({
                            data: newDerivedRates,
                            skipDuplicates: true
                        });

                        // Ensure they are updated if they already existed, BUT ONLY if NOT manually overridden
                        await tx.rate.updateMany({
                            where: {
                                propertyId: hotelId,
                                roomTypeId: { in: params.roomTypeIds },
                                ratePlanCode: child.code,
                                date: { in: dates },
                                isManualOverride: false // DO NOT overwrite if RM set it manually
                            },
                            data: {
                                amount: childAmount
                            }
                        });

                        // Also record audit log for the automatic derived update
                        const childRtCodes = roomTypes.map(rt => rt.code).join(',');
                        await tx.ariEvent.create({
                            data: {
                                propertyId: hotelId,
                                roomTypeCode: childRtCodes,
                                eventType: 'RATE',
                                dateRange: { from: params.fromDate, to: params.toDate } as any,
                                payload: {
                                    price: childAmount,
                                    _autoDerivedFrom: rpc,
                                    _derivedRule: `${child.derivedType} ${child.derivedValue}`,
                                    _parentPrice: parentAmount,
                                    _rmCalculation: calcDetails
                                } as any,
                                status: 'APPLIED',
                                occurredAt: new Date(),
                                ratePlanCode: child.code
                            }
                        });
                    }
                }
                // --- END Derived Rates Logic ---
            }

            if (Object.keys(resData).length > 0) {
                await (tx.restriction as any).updateMany({
                    where: {
                        propertyId: hotelId,
                        roomTypeId: { in: params.roomTypeIds },
                        ratePlanCode: rpc,
                        date: { in: dates }
                    },
                    data: resData
                });
            }

            // --- AUDIT LOGS: Record main events within the transaction ---
            const eventType = params.fields.available !== undefined ? 'AVAILABILITY' :
                params.fields.price !== undefined ? 'RATE' : 'RESTRICTION';

            for (const rt of roomTypes) {
                const rtId = rt.id;
                const physicalCount = physicalCounts[rtId] || 0;
                const requestedAvailable = params.fields.available !== undefined ? Number(params.fields.available) : undefined;

                const eventPayload = {
                    ...params.fields,
                    _previousInventories: (params as any)._prevInventories?.filter((i: any) => i.roomTypeId === rtId),
                    _previousRates: (params as any)._prevRates?.filter((r: any) => r.roomTypeId === rtId)
                };
                if (requestedAvailable !== undefined && requestedAvailable > physicalCount) {
                    (eventPayload as any)._originalRequested = requestedAvailable;
                    (eventPayload as any)._appliedCap = physicalCount;
                }

                await tx.ariEvent.create({
                    data: {
                        propertyId: hotelId,
                        roomTypeCode: rt.code,
                        eventType: eventType as any,
                        dateRange: { from: params.fromDate, to: params.toDate } as any,
                        payload: eventPayload,
                        status: 'APPLIED',
                        occurredAt: new Date(),
                        ratePlanCode: rpc
                    }
                });
            }
        });

        return {
            message: 'Bulk update applied successfully',
            warnings: warnings.length > 0 ? warnings : undefined
        };
    }

    /**
     * Applies RM rounding rules to a calculated rate.
     */
    private applyRounding(value: number, rule: string): number {
        switch (rule) {
            case 'NEAREST_WHOLE':
                return Math.round(value);
            case 'ENDING_99':
                return Math.floor(value) + 0.99;
            case 'ENDING_90':
                return Math.floor(value) + 0.90;
            case 'MULTIPLE_5':
                return Math.round(value / 5) * 5;
            case 'MULTIPLE_10':
                return Math.round(value / 10) * 10;
            case 'NONE':
            default:
                return value;
        }
    }


    /**
     * Reverts a bulk update using information from an AriEvent.
     */
    async undoBulk(hotelId: string, eventId: string) {
        return await prisma.$transaction(async (tx) => {
            const event = await tx.ariEvent.findUnique({
                where: { eventId }
            });

            if (!event || event.propertyId !== hotelId) {
                throw new Error('Evento não encontrado ou acesso não autorizado');
            }

            const payload = event.payload as any;
            const prevInvs = payload._previousInventories || [];
            const prevRates = payload._previousRates || [];

            // Undo Inventories
            for (const inv of prevInvs) {
                await tx.inventory.updateMany({
                    where: {
                        propertyId: hotelId,
                        roomTypeId: inv.roomTypeId,
                        date: new Date(inv.date)
                    },
                    data: {
                        available: inv.available,
                        total: inv.total
                    }
                });
            }

            // Undo Rates
            for (const rate of prevRates) {
                await tx.rate.updateMany({
                    where: {
                        propertyId: hotelId,
                        roomTypeId: rate.roomTypeId,
                        ratePlanCode: rate.ratePlanCode,
                        date: new Date(rate.date)
                    },
                    data: {
                        amount: rate.amount,
                        isManualOverride: rate.isManualOverride
                    }
                });
            }

            // Mark event as UNDONE
            await tx.ariEvent.update({
                where: { eventId },
                data: {
                    status: 'PENDING',
                    payload: { ...payload, _undoneAt: new Date() }
                }
            });

            return { message: 'Desfazer aplicado com sucesso' };
        });
    }

    /**
     * Records an ARI event for audit trail and channel synchronization.
     */
    async recordEvent(data: {
        propertyId: string;
        roomTypeCode: string;
        eventType: 'AVAILABILITY' | 'RATE' | 'RESTRICTION';
        dateRange: { from: string; to: string };
        payload: any;
        status?: 'PENDING' | 'APPLIED' | 'ERROR';
        ratePlanCode?: string;
    }) {
        return await prisma.ariEvent.create({
            data: {
                propertyId: data.propertyId,
                roomTypeCode: data.roomTypeCode,
                eventType: data.eventType,
                dateRange: data.dateRange,
                payload: data.payload,
                status: data.status || 'PENDING',
                occurredAt: new Date(),
                ratePlanCode: data.ratePlanCode
            }
        });
    }
}

export const ariService = new AriService();
