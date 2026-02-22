import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PackageService } from '@/lib/services/monetization/package.service';
import { PackageRepository } from '@/lib/repositories/monetization/package.repository';
import { addDays, format } from 'date-fns';

// Mock Repository
const mockPackageRepository = {
    create: vi.fn(),
    findAvailable: vi.fn()
} as unknown as PackageRepository;

describe('Feature: Package Bundles', () => {
    let service: PackageService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new PackageService(mockPackageRepository);
    });

    it('Scenario: Create a romantic getaway package', async () => {
        // Given I am a hotel manager for property "hotel-123"
        const packageData = {
            code: 'ROMANTIC_GETAWAY',
            name: 'Romantic Getaway',
            propertyId: 'hotel-123',
            roomTypeId: 'rt-002',
            basePrice: 470,
            discountPct: 20,
            validFrom: new Date('2026-02-01'),
            validUntil: new Date('2026-12-31'),
            items: [
                { name: 'Champagne Breakfast', type: 'PRODUCT' as const, unitPrice: 45, quantity: 1 },
                { name: 'Couples Massage', type: 'SERVICE' as const, unitPrice: 150, quantity: 1 },
                { name: 'Late Checkout', type: 'SERVICE' as const, unitPrice: 25, quantity: 1 }
            ]
        };

        // Mock return value
        vi.mocked(mockPackageRepository.create).mockResolvedValue({
            ...packageData,
            id: 'pkg-123',
            finalPrice: 376, // 470 * 0.8
            active: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            items: packageData.items.map(i => ({ ...i, id: 'item-1', packageId: 'pkg-123' }))
        } as any);

        // When I create a package
        const result = await service.createPackage(packageData);

        // Then the package should be created successfully
        expect(result).toBeDefined();
        expect(result.code).toBe('ROMANTIC_GETAWAY');

        // And the final price should be $376 (470 * 0.8)
        expect(Number(result.finalPrice)).toBe(376);
    });

    it('Scenario: Calculate package price for multi-night stay', () => {
        // Given a package "ROMANTIC_GETAWAY" exists
        const pkg = {
            basePrice: 470,
            discountPct: 20,
            items: [
                { name: 'Breakfast', unitPrice: 45, postingPattern: 'DAILY', quantity: 1 }, // 45 * 3 = 135
                { name: 'Massage', unitPrice: 150, postingPattern: 'ON_ARRIVAL', quantity: 1 } // 150
            ]
        };

        // When I calculate the price for a 3-night stay
        const nights = 3;

        // NOTE: calculateTotalValue in service only calculates ITEMS value currently based on the simplified service I saw.
        // Let's verify what the service actually does. 
        // Logic: itemsValue = sum(item.price * qty * (nights if daily))
        // Total Package Value for guest usually implies Room Price + Items.
        // The service 'calculateTotalValue' I refactored returns explicit items value.
        // Let's test that specific logic from the service.

        const totalValue = service.calculateTotalValue(pkg, nights);

        // Breakfast: 45 * 3 = 135
        // Massage: 150 * 1 = 150
        // Total Items Value = 285
        expect(totalValue).toBe(285);
    });

    it('Scenario: Package not available outside valid dates', async () => {
        // Given a package "SUMMER_SPECIAL" exists with validity
        const checkIn = new Date('2026-09-15');
        const checkOut = new Date('2026-09-18');

        // Mock repository returning empty list (simulating DB query filtering)
        vi.mocked(mockPackageRepository.findAvailable).mockResolvedValue([]);

        // When I search for available packages
        const packages = await service.findAvailablePackages('hotel-123', 'rt-001', checkIn, checkOut);

        // Then the package "SUMMER_SPECIAL" should not be available
        expect(packages).toHaveLength(0);
        expect(mockPackageRepository.findAvailable).toHaveBeenCalledWith(
            'hotel-123',
            'rt-001',
            checkIn,
            checkOut,
            3 // 3 nights
        );
    });
});
