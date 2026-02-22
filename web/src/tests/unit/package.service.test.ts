import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { packageService } from '@/lib/services/monetization/package.service';
import { prisma } from '@/lib/db';
import { addDays } from 'date-fns';

describe('PackageService', () => {
    const propertyId = 'test-hotel-pkg';
    const roomTypeId = 'test-room-pkg';

    beforeEach(async () => {
        // Setup deps
        await prisma.property.create({
            data: {
                id: propertyId,
                name: "Package Hotel",
                code: "PKG_HOTEL"
            }
        });
        await prisma.roomType.create({
            data: {
                id: roomTypeId,
                propertyId,
                code: "PKG_ROOM",
                name: "Suite"
            }
        });
    });

    afterEach(async () => {
        const deletePackageItems = prisma.packageItem.deleteMany({});
        const deletePackages = prisma.package.deleteMany({});
        const deleteRoomTypes = prisma.roomType.deleteMany({ where: { propertyId } });
        const deleteProperty = prisma.property.deleteMany({ where: { id: propertyId } });

        await prisma.$transaction([
            deletePackageItems,
            deletePackages,
            deleteRoomTypes,
            deleteProperty
        ]);
    });

    it('should create a package with items', async () => {
        const pkg = await packageService.createPackage({
            code: 'ROMANTIC_GETAWAY',
            name: 'Romantic Getaway',
            propertyId,
            roomTypeId,
            basePrice: 500,
            discountPct: 10,
            validFrom: new Date(),
            validUntil: addDays(new Date(), 30),
            items: [
                { name: 'Champagne', type: 'PRODUCT', unitPrice: 100, postingPattern: 'ON_ARRIVAL' },
                { name: 'Dinner', type: 'EXPERIENCE', unitPrice: 150, postingPattern: 'DAILY' }
            ]
        });

        expect(pkg).toBeDefined();
        expect(pkg.items).toHaveLength(2);
        expect(Number(pkg.finalPrice)).toBe(450); // 500 * 0.9
    });

    it('should find available packages for a stay', async () => {
        // Create a package
        await packageService.createPackage({
            code: 'SUMMER_FUN',
            name: 'Summer Fun',
            propertyId,
            roomTypeId,
            basePrice: 200,
            discountPct: 0,
            validFrom: new Date(),
            validUntil: addDays(new Date(), 60),
            minStayNights: 2,
            items: []
        });

        const checkIn = addDays(new Date(), 2);
        const checkOut = addDays(new Date(), 5); // 3 nights

        const packages = await packageService.findAvailablePackages(propertyId, roomTypeId, checkIn, checkOut);

        expect(packages).toHaveLength(1);
        expect(packages[0].code).toBe('SUMMER_FUN');
    });

    it('should filter out packages with minStayNights not met', async () => {
        await packageService.createPackage({
            code: 'LONG_STAY',
            name: 'Long Stay',
            propertyId,
            roomTypeId,
            basePrice: 1000,
            discountPct: 20,
            validFrom: new Date(),
            validUntil: addDays(new Date(), 60),
            minStayNights: 5,
            items: []
        });

        const checkIn = addDays(new Date(), 2);
        const checkOut = addDays(new Date(), 5); // 3 nights

        const packages = await packageService.findAvailablePackages(propertyId, roomTypeId, checkIn, checkOut);

        expect(packages).toHaveLength(0);
    });
});
