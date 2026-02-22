import { prisma } from '@/lib/db';
import { CreatePackageInput } from '@/lib/schemas/monetization/package.schema';

export class PackageRepository {
    async create(data: CreatePackageInput & { finalPrice: number }) {
        return prisma.package.create({
            data: {
                ...data,
                items: {
                    create: data.items.map(item => ({
                        ...item,
                        quantity: item.quantity ?? 1
                    }))
                }
            },
            include: { items: true }
        });
    }

    async findAvailable(propertyId: string, roomTypeId: string, checkIn: Date, checkOut: Date, nights: number) {
        return prisma.package.findMany({
            where: {
                propertyId,
                roomTypeId,
                active: true,
                validFrom: { lte: checkIn },
                validUntil: { gte: checkOut },
                minStayNights: { lte: nights }
            },
            include: { items: true }
        });
    }

    async findById(id: string) {
        return prisma.package.findUnique({
            where: { id },
            include: { items: true }
        });
    }

    async findAll(propertyId: string) {
        return prisma.package.findMany({
            where: { propertyId },
            include: { items: true },
            orderBy: { createdAt: 'desc' }
        });
    }

    async update(id: string, data: Partial<CreatePackageInput> & { finalPrice?: number }) {
        // Handle items update: delete existing and recreate (simple strategy for now)
        // ideally we would diff, but for MVP this ensures consistency
        const { items, ...packageData } = data;

        return prisma.package.update({
            where: { id },
            data: {
                ...packageData,
                ...(items && {
                    items: {
                        deleteMany: {},
                        create: items.map(item => ({
                            ...item,
                            quantity: item.quantity ?? 1
                        }))
                    }
                })
            },
            include: { items: true }
        });
    }

    async delete(id: string) {
        return prisma.package.delete({
            where: { id }
        });
    }
}

export const packageRepository = new PackageRepository();
