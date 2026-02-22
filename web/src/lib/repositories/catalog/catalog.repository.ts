import { prisma } from '@/lib/db';
import { Property, RoomType, RatePlan } from '@prisma/client';

export class CatalogRepository {
    async findPropertyById(id: string): Promise<Property | null> {
        return prisma.property.findUnique({ where: { id } });
    }

    async findRoomType(propertyId: string, code: string): Promise<RoomType | null> {
        return prisma.roomType.findUnique({
            where: { propertyId_code: { propertyId, code } }
        });
    }

    async findRoomTypes(propertyId: string): Promise<RoomType[]> {
        return prisma.roomType.findMany({
            where: { propertyId },
            include: { inventory: false } // Avoid loading heavy relations by default
        });
    }

    async findRatePlan(propertyId: string, code: string): Promise<RatePlan | null> {
        return prisma.ratePlan.findUnique({
            where: { propertyId_code: { propertyId, code } }
        });
    }
}

export const catalogRepository = new CatalogRepository();
