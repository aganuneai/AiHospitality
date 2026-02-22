/**
 * Upsell Service
 * 
 * Manages upgrade offers during booking flow:
 * - Room type upgrades
 * - Rate plan upgrades
 * - Package upgrades
 * - Intelligent offer targeting
 */

import { prisma } from '../db';
import { logger } from '../logger';
import { getCurrentTenantId } from '../tenancy/tenant-context';

/**
 * Upsell offer
 */
export interface UpsellOffer {
    id: string;
    type: 'ROOM_UPGRADE' | 'RATE_UPGRADE' | 'PACKAGE_UPGRADE' | 'ADD_ON';
    title: string;
    description: string;

    // Pricing
    currentPrice: number;
    upgradedPrice: number;
    difference: number;
    savings?: number;  // If there's a discount

    // Details
    fromItem: {
        id: string;
        name: string;
    };
    toItem: {
        id: string;
        name: string;
        features?: string[];
    };

    // Targeting
    priority: number;  // Higher = shown first
    conversionRate?: number;  // Historical conversion rate

    validUntil?: Date;
}

/**
 * Upsell context (booking details)
 */
export interface UpsellContext {
    propertyId: string;
    roomTypeId: string;
    ratePlanCode: string;
    checkIn: Date;
    checkOut: Date;
    guests: number;
    basePrice: number;
}

/**
 * Upsell Service
 */
export class UpsellService {

    /**
     * Get intelligent upsell offers
     * 
     * @param context - Booking context
     */
    async getUpsellOffers(context: UpsellContext): Promise<UpsellOffer[]> {
        const tenantId = getCurrentTenantId();

        logger.info('Generating upsell offers', {
            tenantId,
            propertyId: context.propertyId,
            roomTypeId: context.roomTypeId
        });

        const offers: UpsellOffer[] = [];

        // 1. Room type upgrades
        const roomUpgrades = await this.getRoomUpgradeOffers(context);
        offers.push(...roomUpgrades);

        // 2. Package upgrades
        const packageUpgrades = await this.getPackageUpgradeOffers(context);
        offers.push(...packageUpgrades);

        // 3. Add-on offers
        const addOnOffers = await this.getAddOnOffers(context);
        offers.push(...addOnOffers);

        // Sort by priority (highest first)
        offers.sort((a, b) => b.priority - a.priority);

        // Limit to top 3 offers
        const topOffers = offers.slice(0, 3);

        logger.info('Upsell offers generated', {
            totalOffers: offers.length,
            selectedOffers: topOffers.length
        });

        return topOffers;
    }

    /**
     * Get room upgrade offers
     */
    private async getRoomUpgradeOffers(context: UpsellContext): Promise<UpsellOffer[]> {
        const offers: UpsellOffer[] = [];

        // Get current room type
        const currentRoom = await prisma.roomType.findUnique({
            where: { id: context.roomTypeId }
        });

        if (!currentRoom) {
            return offers;
        }

        // Find upgradeable room types (higher category)
        const upgradeRooms = await prisma.roomType.findMany({
            where: {
                propertyId: context.propertyId,
                id: { not: context.roomTypeId }
            },
            take: 3  // Top 3 upgrades
        });

        const nights = this.calculateNights(context.checkIn, context.checkOut);
        const currentBaseRate = Number(context.basePrice);

        for (const upgradeRoom of upgradeRooms) {
            const currentPrice = currentBaseRate * nights;
            const upgradedPrice = currentBaseRate * 1.3 * nights; // Estimate 30% upgrade premium
            const difference = upgradedPrice - currentPrice;

            // Calculate priority based on price difference (smaller = higher priority)
            const priceDiffRatio = difference / currentPrice;
            const priority = priceDiffRatio < 0.3 ? 90 : priceDiffRatio < 0.5 ? 70 : 50;

            offers.push({
                id: `room_upgrade_${upgradeRoom.id}`,
                type: 'ROOM_UPGRADE',
                title: `Upgrade to ${upgradeRoom.name}`,
                description: `Enjoy more space and premium amenities`,
                currentPrice,
                upgradedPrice,
                difference,
                fromItem: {
                    id: currentRoom.id,
                    name: currentRoom.name
                },
                toItem: {
                    id: upgradeRoom.id,
                    name: upgradeRoom.name,
                    features: this.getRoomFeatures(upgradeRoom.code)
                },
                priority,
                conversionRate: this.getHistoricalConversionRate('ROOM_UPGRADE', difference)
            });
        }

        return offers;
    }

    /**
     * Get package upgrade offers
     */
    private async getPackageUpgradeOffers(context: UpsellContext): Promise<UpsellOffer[]> {
        // Package model is not implemented in schema.prisma
        return [];
    }

    /**
     * Get add-on offers
     */
    private async getAddOnOffers(context: UpsellContext): Promise<UpsellOffer[]> {
        const offers: UpsellOffer[] = [];

        // Popular add-ons
        const popularAddOns = [
            {
                id: 'breakfast',
                name: 'Daily Breakfast',
                price: 25,
                description: 'Start your day with our delicious breakfast buffet',
                priority: 80
            },
            {
                id: 'parking',
                name: 'Valet Parking',
                price: 30,
                description: 'Hassle-free parking with valet service',
                priority: 70
            },
            {
                id: 'late_checkout',
                name: 'Late Checkout',
                price: 35,
                description: 'Extend your stay until 2 PM',
                priority: 60
            }
        ];

        const nights = this.calculateNights(context.checkIn, context.checkOut);

        for (const addon of popularAddOns) {
            const addonTotal = addon.price * nights;

            offers.push({
                id: `addon_${addon.id}`,
                type: 'ADD_ON',
                title: `Add ${addon.name}`,
                description: addon.description,
                currentPrice: context.basePrice * nights,
                upgradedPrice: (context.basePrice * nights) + addonTotal,
                difference: addonTotal,
                fromItem: {
                    id: 'base',
                    name: 'Room Only'
                },
                toItem: {
                    id: addon.id,
                    name: addon.name
                },
                priority: addon.priority,
                conversionRate: this.getHistoricalConversionRate('ADD_ON', addonTotal)
            });
        }

        return offers;
    }

    /**
     * Get room features by category
     */
    private getRoomFeatures(category: string): string[] {
        const featureMap: Record<string, string[]> = {
            'STANDARD': ['Comfortable bed', 'Air conditioning', 'WiFi'],
            'DELUXE': ['King bed', 'City view', 'Mini bar', 'Premium WiFi'],
            'SUITE': ['Separate living area', 'Panoramic view', 'Executive lounge access', 'Walk-in closet'],
            'EXECUTIVE': ['Executive lounge access', 'Premium amenities', 'Business center'],
            'PRESIDENTIAL': ['Private butler', 'Luxury amenities', 'VIP treatment', 'Private balcony']
        };

        return featureMap[category] || [];
    }

    /**
     * Calculate nights from date range
     */
    private calculateNights(checkIn: Date, checkOut: Date): number {
        return Math.ceil(
            (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
        );
    }

    /**
     * Get historical conversion rate (mock)
     * 
     * In production, this would query analytics data
     */
    private getHistoricalConversionRate(offerType: string, priceDifference: number): number {
        // Mock conversion rates based on price difference
        if (priceDifference < 50) return 0.45;  // Low difference = high conversion
        if (priceDifference < 100) return 0.30;
        if (priceDifference < 200) return 0.20;
        return 0.10;  // High difference = low conversion
    }

    /**
     * Track upsell acceptance
     * 
     * @param offerId - Offer ID
     * @param accepted - Whether offer was accepted
     */
    async trackUpsellOutcome(offerId: string, accepted: boolean): Promise<void> {
        logger.info('Upsell outcome tracked', {
            offerId,
            accepted
        });

        // In production, store in analytics DB
        // await prisma.upsellTracking.create({
        //     data: { offerId, accepted, timestamp: new Date() }
        // });
    }

    /**
     * Get upsell performance metrics
     */
    async getUpsellMetrics(propertyId: string, dateRange: { start: Date; end: Date }): Promise<{
        totalOffers: number;
        acceptedOffers: number;
        conversionRate: number;
        revenueGenerated: number;
    }> {
        // Mock metrics
        return {
            totalOffers: 1250,
            acceptedOffers: 387,
            conversionRate: 0.31,  // 31%
            revenueGenerated: 45780  // $45,780
        };
    }
}

/**
 * Singleton instance
 */
export const upsellService = new UpsellService();
