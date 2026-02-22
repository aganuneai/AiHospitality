import { prisma } from '@/lib/db';
import { Inventory, Restriction, Prisma } from '@prisma/client';

export class InventoryRepository {
    async findAvailability(propertyId: string, roomTypeId: string, from: Date, to: Date): Promise<Inventory[]> {
        // Normalize to ISO date strings for robust DB comparison
        const fromStr = from.toISOString().split('T')[0];
        const toStr = to.toISOString().split('T')[0];

        return prisma.inventory.findMany({
            where: {
                propertyId,
                roomTypeId,
                date: {
                    gte: new Date(fromStr + 'T00:00:00Z'),
                    lt: new Date(toStr + 'T00:00:00Z')
                }
            }
        });
    }

    async findRestrictions(propertyId: string, roomTypeId: string, from: Date, to: Date): Promise<Restriction[]> {
        const fromStr = from.toISOString().split('T')[0];
        const toStr = to.toISOString().split('T')[0];

        return prisma.restriction.findMany({
            where: {
                propertyId,
                roomTypeId,
                date: {
                    gte: new Date(fromStr + 'T00:00:00Z'),
                    lte: new Date(toStr + 'T00:00:00Z') // Restrictions might apply on check-out day (e.g. check-out forbidden)
                }
            }
        });
    }

    async checkAvailability(propertyId: string, roomTypeId: string, from: Date, to: Date, quantity: number = 1): Promise<boolean> {
        const inventory = await this.findAvailability(propertyId, roomTypeId, from, to);
        // Check if we have records for all nights (logic could differ if missing record means 0 or infinite)
        // Assuming explicit inventory required.
        // Also check if any night has < quantity
        // TODO: Validate logic for missing dates

        return inventory.every(i => i.available >= quantity);
    }
    async upsertAvailability(
        propertyId: string,
        roomTypeId: string,
        date: Date,
        value: number,
        updateType: 'SET' | 'INCREMENT' | 'DECREMENT'
    ) {
        const count = await prisma.room.count({
            where: { roomTypeId, status: { not: 'OOO' } }
        });

        const where = { propertyId_roomTypeId_date: { propertyId, roomTypeId, date } };
        const baseCreate = { propertyId, roomTypeId, date, total: count, available: Math.min(value, count), booked: 0 };

        if (updateType === 'SET') {
            const safeValue = Math.min(value, count);
            return prisma.inventory.upsert({
                where,
                create: baseCreate,
                update: { available: safeValue, total: count }
            });
        } else if (updateType === 'INCREMENT') {
            // To apply hard-cap on atomic increment, we need to handle it carefully.
            // Since we can't 'clamp' easily in prisma.update, we fetch existing or use result.
            const existing = await prisma.inventory.findUnique({ where });
            const currentAvail = existing?.available ?? baseCreate.available;
            const safeValue = Math.min(currentAvail + value, count);

            return prisma.inventory.upsert({
                where,
                create: { ...baseCreate, available: Math.min(value, count) },
                update: {
                    available: safeValue,
                    total: count
                }
            });
        } else { // DECREMENT
            const existing = await prisma.inventory.findUnique({ where });
            const currentAvail = existing?.available ?? 0;
            const safeValue = Math.max(0, currentAvail - value);

            return prisma.inventory.upsert({
                where,
                create: { ...baseCreate, total: count, available: 0 },
                update: {
                    available: safeValue,
                    total: count
                }
            });
        }
    }

    async upsertPrice(propertyId: string, roomTypeId: string, date: Date, price: number) {
        const count = await prisma.room.count({
            where: { roomTypeId, status: { not: 'OOO' } }
        });

        return prisma.inventory.upsert({
            where: { propertyId_roomTypeId_date: { propertyId, roomTypeId, date } },
            create: { propertyId, roomTypeId, date, total: count, available: count, booked: 0, price: new Prisma.Decimal(price) },
            update: { price: new Prisma.Decimal(price) }
        });
    }

    async upsertRestriction(propertyId: string, roomTypeId: string, date: Date, restrictions: any) {
        return prisma.restriction.upsert({
            where: { propertyId_roomTypeId_date_ratePlanCode: { propertyId, roomTypeId, date, ratePlanCode: 'BASE' } },
            create: {
                propertyId, roomTypeId, date, ratePlanCode: 'BASE',
                minLOS: restrictions.minLOS ?? restrictions.minLos ?? null,
                maxLOS: restrictions.maxLOS ?? restrictions.maxLos ?? null,
                closedToArrival: restrictions.closedToArrival ?? false,
                closedToDeparture: restrictions.closedToDeparture ?? false,
                closed: restrictions.closed ?? false
            },
            update: {
                minLOS: restrictions.minLOS ?? restrictions.minLos ?? null,
                maxLOS: restrictions.maxLOS ?? restrictions.maxLos ?? null,
                closedToArrival: restrictions.closedToArrival ?? false,
                closedToDeparture: restrictions.closedToDeparture ?? false,
                closed: restrictions.closed ?? false
            }
        });
    }
}

export const inventoryRepository = new InventoryRepository();
