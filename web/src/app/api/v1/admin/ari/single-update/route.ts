import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { format, parseISO } from "date-fns";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { date, roomTypeId, ratePlanCode, field, value } = body;

        if (!date || !roomTypeId || !field || value === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const roomType = await prisma.roomType.findUnique({
            where: { id: roomTypeId },
            select: { propertyId: true, code: true }
        });

        if (!roomType) {
            return NextResponse.json({ error: "RoomType not found" }, { status: 404 });
        }

        const hotelId = roomType.propertyId;

        const targetDate = parseISO(date);
        const dateKey = format(targetDate, 'yyyy-MM-dd'); // Strictly YYYY-MM-DD

        const rpc = ratePlanCode || 'BASE';
        let updatedEntity = null;

        // Update the specific field
        switch (field) {
            case 'price':
                await prisma.$transaction(async (tx: any) => {
                    // Update main rate explicitly via raw SQL
                    await tx.$executeRaw`
                        INSERT INTO "Rate" ("id", "propertyId", "roomTypeId", "date", "ratePlanCode", "amount", "isManualOverride", "updatedAt") 
                        VALUES (gen_random_uuid(), ${hotelId}, ${roomTypeId}, ${dateKey}::date, ${rpc}, ${Number(value)}::numeric, true, NOW())
                        ON CONFLICT ("propertyId", "roomTypeId", "date", "ratePlanCode") 
                        DO UPDATE SET "amount" = EXCLUDED."amount", "isManualOverride" = true, "updatedAt" = NOW()
                    `;
                    updatedEntity = { updated: true };

                    // Also check for derived rates update when editing inline
                    const derivedRatePlans: any[] = await tx.$queryRaw`
                        SELECT "code", "derivedType", "derivedValue", "roundingRule" 
                        FROM "RatePlan" 
                        WHERE "parentRatePlanId" IN (
                            SELECT "id" FROM "RatePlan" 
                            WHERE "propertyId" = ${hotelId} AND "code" = ${rpc}
                        )
                    `;

                    if (derivedRatePlans && derivedRatePlans.length > 0) {
                        for (const child of derivedRatePlans) {
                            if (!child.derivedType || child.derivedValue === null) continue;

                            const parentAmount = Number(value);
                            let childAmount = parentAmount;

                            if (child.derivedType === 'PERCENTAGE') {
                                const discount = parentAmount * (Number(child.derivedValue) / 100);
                                childAmount = parentAmount + discount;
                            } else if (child.derivedType === 'FIXED_AMOUNT') {
                                childAmount = parentAmount + Number(child.derivedValue);
                            }
                            if (childAmount < 0) childAmount = 0;

                            // Apply rounding logic inline for raw SQL (simplified version of AriService.applyRounding)
                            const rule = child.roundingRule || 'NONE';
                            let roundedAmount = childAmount;
                            if (rule === 'NEAREST_WHOLE') roundedAmount = Math.round(childAmount);
                            else if (rule === 'ENDING_99') roundedAmount = Math.floor(childAmount) + 0.99;
                            else if (rule === 'ENDING_90') roundedAmount = Math.floor(childAmount) + 0.90;
                            else if (rule === 'MULTIPLE_5') roundedAmount = Math.round(childAmount / 5) * 5;
                            else if (rule === 'MULTIPLE_10') roundedAmount = Math.round(childAmount / 10) * 10;

                            childAmount = roundedAmount;
                            const calcDetails = `${parentAmount} ${child.derivedType === 'PERCENTAGE' ? (Number(child.derivedValue) >= 0 ? '+' : '') + child.derivedValue + '%' : (Number(child.derivedValue) >= 0 ? '+' : '') + child.derivedValue} = ${roundedAmount.toFixed(2)} (Round: ${rule})`;

                            await tx.$executeRaw`
                                INSERT INTO "Rate" ("id", "propertyId", "roomTypeId", "date", "ratePlanCode", "amount", "isManualOverride", "updatedAt") 
                                VALUES (gen_random_uuid(), ${hotelId}, ${roomTypeId}, ${dateKey}::date, ${child.code}, ${childAmount}::numeric, false, NOW())
                                ON CONFLICT ("propertyId", "roomTypeId", "date", "ratePlanCode") 
                                DO UPDATE SET "amount" = CASE WHEN "Rate"."isManualOverride" = false THEN EXCLUDED."amount" ELSE "Rate"."amount" END, "updatedAt" = NOW()
                            `;

                            // Audit log for derivative child
                            await tx.$executeRaw`
                                INSERT INTO "AriEvent" ("eventId", "propertyId", "roomTypeCode", "eventType", "dateRange", "payload", "status", "occurredAt", "ratePlanCode", "createdAt")
                                VALUES (gen_random_uuid(), ${hotelId}, ${roomTypeId}, 'RATE', ${JSON.stringify({ from: date, to: date })}::jsonb, ${JSON.stringify({ price: childAmount, _autoDerivedFrom: rpc, _inline: true, _rmCalculation: calcDetails })}::jsonb, 'APPLIED', NOW(), ${child.code}, NOW())
                            `;
                        }
                    }
                });
                break;
            case 'clear_price':
                await prisma.$transaction(async (tx: any) => {
                    // Delete the explicit rate override
                    await tx.$executeRaw`
                        DELETE FROM "Rate" 
                        WHERE "propertyId" = ${hotelId} 
                        AND "roomTypeId" = ${roomTypeId} 
                        AND "date" = ${dateKey}::date 
                        AND "ratePlanCode" = ${rpc}
                    `;

                    // Also delete auto-derived children to force recalculation on next fetch
                    // This is cleaner than trying to recalculate them here without a reference amount
                    await tx.$executeRaw`
                        DELETE FROM "Rate" 
                        WHERE "propertyId" = ${hotelId} 
                        AND "roomTypeId" = ${roomTypeId} 
                        AND "date" = ${dateKey}::date 
                        AND "ratePlanCode" IN (
                            SELECT "code" FROM "RatePlan" 
                            WHERE "parentRatePlanId" IN (
                                SELECT "id" FROM "RatePlan" 
                                WHERE "propertyId" = ${hotelId} AND "code" = ${rpc}
                            )
                        )
                        AND "isManualOverride" = false
                    `;

                    updatedEntity = { cleared: true };
                });
                break;
            case 'closed':
            case 'closedToArrival':
            case 'closedToDeparture':
            case 'minLOS':
            case 'maxLOS': {
                const isLos = field.includes('LOS');
                const parsedValue = isLos ? Number(value) : (value === 'true' || value === true || value === 1);

                // Construct safe SQL block for dynamic col
                if (isLos) {
                    const colName = field === 'minLOS' ? "minLOS" : "maxLOS";
                    await prisma.$executeRawUnsafe(`
                        INSERT INTO "Restriction" ("id", "propertyId", "roomTypeId", "date", "ratePlanCode", "${colName}", "updatedAt") 
                        VALUES (gen_random_uuid(), $1, $2, $3::date, 'BASE', $4, NOW())
                        ON CONFLICT ("propertyId", "roomTypeId", "date", "ratePlanCode") 
                        DO UPDATE SET "${colName}" = EXCLUDED."${colName}", "updatedAt" = NOW()
                    `, hotelId, roomTypeId, dateKey, parsedValue);
                } else {
                    const colName = field;
                    await prisma.$executeRawUnsafe(`
                        INSERT INTO "Restriction" ("id", "propertyId", "roomTypeId", "date", "ratePlanCode", "${colName}", "updatedAt") 
                        VALUES (gen_random_uuid(), $1, $2, $3::date, 'BASE', $4, NOW())
                        ON CONFLICT ("propertyId", "roomTypeId", "date", "ratePlanCode") 
                        DO UPDATE SET "${colName}" = EXCLUDED."${colName}", "updatedAt" = NOW()
                    `, hotelId, roomTypeId, dateKey, parsedValue);
                }

                updatedEntity = { updated: true };
                break;
            }
            case 'available': {
                // HARD-CAP OVERBOOKING PROTECTION
                // 1. Get real physical room count
                const physicalCount = await prisma.room.count({
                    where: {
                        roomTypeId: roomTypeId,
                        status: { not: 'OOO' } // Excluding Out Of Order
                    }
                });

                // 2. We don't have a direct 'booked' counter on Inventory yet, but we will protect 
                // the ceiling against the absolute physical limit anyway.
                const reqValue = Number(value);
                const safeValue = Math.min(reqValue, physicalCount);

                await prisma.$executeRaw`
                    INSERT INTO "Inventory" ("id", "propertyId", "roomTypeId", "date", "total", "available", "updatedAt") 
                    VALUES (gen_random_uuid(), ${hotelId}, ${roomTypeId}, ${dateKey}::date, ${physicalCount}::integer, ${safeValue}::integer, NOW())
                    ON CONFLICT ("propertyId", "roomTypeId", "date") 
                    DO UPDATE SET "available" = EXCLUDED."available", "total" = EXCLUDED."total", "updatedAt" = NOW()
                `;
                updatedEntity = { updated: true, originalRequest: reqValue, physicalCapApplied: safeValue !== reqValue };
                break;
            }
            default:
                return NextResponse.json({ error: "Invalid field to update" }, { status: 400 });
        }

        // Create Audit Trail
        await prisma.ariEvent.create({
            data: {
                propertyId: hotelId,
                roomTypeCode: roomType.code || roomTypeId,
                eventType: field === 'price' ? 'RATE' : field === 'available' ? 'AVAILABILITY' : 'RESTRICTION',
                dateRange: { from: date, to: date },
                payload: { [field]: value, _inline: true }, // _inline flag for auditing
                status: 'APPLIED',
                occurredAt: new Date(),
                ratePlanCode: rpc
            }
        });

        return NextResponse.json({ success: true, updated: updatedEntity });

    } catch (error: any) {
        console.error("[Single Update Error]", error);
        return NextResponse.json({
            error: "Failed to update cell inline",
            details: error?.message || String(error),
            stack: error?.stack
        }, { status: 500 });
    }
}
