import { differenceInCalendarDays } from 'date-fns';
import { PackageRepository, packageRepository } from '@/lib/repositories/monetization/package.repository';
import { CreatePackageInput } from '@/lib/schemas/monetization/package.schema';

export class PackageService {
    constructor(private repository: PackageRepository) { }

    async createPackage(data: any) {
        throw new Error('Package model is not implemented in schema.prisma');
    }

    async updatePackage(id: string, data: any) {
        throw new Error('Package model is not implemented in schema.prisma');
    }

    async deletePackage(id: string) {
        throw new Error('Package model is not implemented in schema.prisma');
    }

    async findPackageById(id: string) {
        return null;
    }

    async findAvailablePackages(propertyId: string, roomTypeId: string, checkIn: Date, checkOut: Date) {
        return [];
    }

    async findAllPackages(propertyId: string) {
        return [];
    }

    calculateTotalValue(pkg: any, nights: number) {
        const itemsValue = pkg.items.reduce((total: number, item: any) => {
            let quantity = item.quantity;
            if (item.postingPattern === 'DAILY') {
                quantity *= nights;
            }
            return total + (Number(item.unitPrice) * (quantity ?? 1));
        }, 0);

        return itemsValue;
    }
}

export const packageService = new PackageService(packageRepository);
