/**
 * Promotions Engine
 * 
 * Manages discount codes and promotional offers:
 * - Code validation and eligibility checks
 * - Discount calculation (percentage or fixed amount)
 * - Usage tracking and limits
 * - Combinations and restrictions
 */

import { prisma } from '../db';
import { logger } from '../logger';
import { getCurrentTenantId } from '../tenancy/tenant-context';

/**
 * Promotion
 */
export interface Promotion {
    id: string;
    code: string;
    name: string;
    description?: string;

    // Discount
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
    discountValue: number;

    // Validity
    validFrom: Date;
    validUntil: Date;

    // Limits
    maxUses?: number;
    currentUses: number;
    maxPerGuest?: number;

    // Eligibility rules
    minStayNights?: number;
    minAmount?: number;
    roomTypes?: string[];
    propertyId?: string;

    // Blackout dates
    blackoutDates?: Date[];

    // Combinability
    combinable: boolean;

    active: boolean;
    createdAt: Date;
}

/**
 * Promotion result
 */
export interface PromotionResult {
    valid: boolean;
    promotion?: Promotion;
    discountAmount: number;
    finalAmount: number;
    errors: string[];
}

/**
 * Booking context for validation
 */
export interface BookingContext {
    propertyId: string;
    roomTypeId: string;
    checkIn: Date;
    checkOut: Date;
    baseAmount: number;
    guestId?: string;
}

/**
 * Promotions Engine
 */
export class PromotionsEngine {

    /**
     * Validate promotion code
     * 
     * @param code - Promotion code
     * @param context - Booking context
     */
    async validateCode(
        code: string,
        context: BookingContext
    ): Promise<PromotionResult> {
        const tenantId = getCurrentTenantId();

        logger.info('Validating promotion code', {
            tenantId,
            code,
            context
        });

        const errors: string[] = [];

        // Find promotion
        const promotion = await prisma.promotion.findUnique({
            where: { code: code.toUpperCase() }
        });

        if (!promotion) {
            errors.push('Invalid promotion code');
            return {
                valid: false,
                discountAmount: 0,
                finalAmount: context.baseAmount,
                errors
            };
        }

        // Check if active
        if (!promotion.active) {
            errors.push('Promotion is no longer active');
        }

        // Check validity period
        const now = new Date();
        if (now < promotion.validFrom) {
            errors.push(`Promotion not yet valid (starts ${promotion.validFrom.toLocaleDateString()})`);
        }
        if (now > promotion.validUntil) {
            errors.push(`Promotion has expired (ended ${promotion.validUntil.toLocaleDateString()})`);
        }

        // Check usage limits
        if (promotion.maxUses && promotion.currentUses >= promotion.maxUses) {
            errors.push('Promotion has reached maximum usage limit');
        }

        // Check per-guest limit
        if (promotion.maxPerGuest && context.guestId) {
            const guestUsage = await this.getGuestUsageCount(
                promotion.id,
                context.guestId
            );

            if (guestUsage >= promotion.maxPerGuest) {
                errors.push('You have already used this promotion the maximum number of times');
            }
        }

        // Check property restriction
        if (promotion.propertyId && promotion.propertyId !== context.propertyId) {
            errors.push('Promotion not valid for this property');
        }

        // Check room type restriction
        if (promotion.roomTypes && promotion.roomTypes.length > 0) {
            if (!promotion.roomTypes.includes(context.roomTypeId)) {
                errors.push('Promotion not valid for this room type');
            }
        }

        // Check minimum stay
        const nights = this.calculateNights(context.checkIn, context.checkOut);
        if (promotion.minStayNights && nights < promotion.minStayNights) {
            errors.push(`Minimum stay of ${promotion.minStayNights} nights required`);
        }

        // Check minimum amount
        if (promotion.minAmount && context.baseAmount < Number(promotion.minAmount)) {
            errors.push(`Minimum booking amount of ${promotion.minAmount} required`);
        }

        // Check blackout dates
        if (promotion.blackoutDates && promotion.blackoutDates.length > 0) {
            const isBlackedOut = this.isDateBlackedOut(
                context.checkIn,
                context.checkOut,
                promotion.blackoutDates
            );

            if (isBlackedOut) {
                errors.push('Promotion not valid for selected dates (blackout period)');
            }
        }

        // If any errors, return invalid
        if (errors.length > 0) {
            return {
                valid: false,
                promotion: this.formatPromotion(promotion),
                discountAmount: 0,
                finalAmount: context.baseAmount,
                errors
            };
        }

        // Calculate discount
        const discountAmount = await this.calculateDiscount(
            promotion,
            context.baseAmount
        );

        const finalAmount = Math.max(0, context.baseAmount - discountAmount);

        logger.info('Promotion validated successfully', {
            code,
            discountAmount,
            finalAmount
        });

        return {
            valid: true,
            promotion: this.formatPromotion(promotion),
            discountAmount,
            finalAmount,
            errors: []
        };
    }

    /**
     * Format promotion for response
     */
    private formatPromotion(promo: any): Promotion {
        return {
            id: promo.id,
            code: promo.code,
            name: promo.name,
            description: promo.description,
            discountType: promo.discountType,
            discountValue: parseFloat(promo.discountValue),
            validFrom: promo.validFrom,
            validUntil: promo.validUntil,
            maxUses: promo.maxUses,
            currentUses: promo.currentUses,
            maxPerGuest: promo.maxPerGuest,
            minStayNights: promo.minStayNights,
            minAmount: promo.minAmount ? parseFloat(promo.minAmount) : undefined,
            roomTypes: promo.roomTypes,
            propertyId: promo.propertyId,
            blackoutDates: promo.blackoutDates,
            combinable: promo.combinable,
            active: promo.active,
            createdAt: promo.createdAt
        };
    }

    /**
     * Calculate discount amount
     * 
     * @param promotion - Promotion
     * @param baseRate - Base rate
     */
    async calculateDiscount(
        promotion: any,
        baseRate: number
    ): Promise<number> {
        if (promotion.discountType === 'PERCENTAGE') {
            const percentage = parseFloat(promotion.discountValue);
            return (baseRate * percentage) / 100;
        } else {
            // FIXED_AMOUNT
            return Math.min(parseFloat(promotion.discountValue), baseRate);
        }
    }

    /**
     * Check if guest is eligible for promotion
     * 
     * @param guestId - Guest ID
     * @param promotion - Promotion
     */
    async checkEligibility(
        guestId: string,
        promotion: Promotion
    ): Promise<boolean> {
        // Check per-guest usage limit
        if (promotion.maxPerGuest) {
            const usage = await this.getGuestUsageCount(promotion.id, guestId);
            if (usage >= promotion.maxPerGuest) {
                return false;
            }
        }

        // Additional eligibility rules can be added here
        // e.g., loyalty tier, previous stays, etc.

        return true;
    }

    /**
     * Get guest usage count for promotion
     */
    private async getGuestUsageCount(
        promotionId: string,
        guestId: string
    ): Promise<number> {
        // In production, track in separate table
        const count = await prisma.reservation.count({
            where: {
                guestId,
                // promotionId (add this field to Reservation model)
            }
        });

        return count;
    }

    /**
     * Calculate number of nights
     */
    private calculateNights(checkIn: Date, checkOut: Date): number {
        return Math.ceil(
            (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
        );
    }

    /**
     * Check if dates fall in blackout period
     */
    private isDateBlackedOut(
        checkIn: Date,
        checkOut: Date,
        blackoutDates: Date[]
    ): boolean {
        for (const blackoutDate of blackoutDates) {
            const blackout = new Date(blackoutDate);
            if (checkIn <= blackout && blackout < checkOut) {
                return true;
            }
        }
        return false;
    }

    /**
     * Increment usage count for promotion
     * 
     * @param promotionId - Promotion ID
     */
    async incrementUsage(promotionId: string): Promise<void> {
        await prisma.promotion.update({
            where: { id: promotionId },
            data: {
                currentUses: {
                    increment: 1
                }
            }
        });

        logger.info('Promotion usage incremented', { promotionId });
    }

    /**
     * Create new promotion
     * 
     * @param data - Promotion data
     */
    async createPromotion(data: {
        code: string;
        name: string;
        description?: string;
        discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
        discountValue: number;
        validFrom: Date;
        validUntil: Date;
        maxUses?: number;
        maxPerGuest?: number;
        minStayNights?: number;
        minAmount?: number;
        roomTypes?: string[];
        propertyId?: string;
        blackoutDates?: Date[];
        combinable?: boolean;
    }): Promise<Promotion> {
        const tenantId = getCurrentTenantId();

        logger.info('Creating promotion', {
            tenantId,
            code: data.code
        });

        // Validate discount value
        if (data.discountType === 'PERCENTAGE' && (data.discountValue < 0 || data.discountValue > 100)) {
            throw new Error('Percentage discount must be between 0 and 100');
        }

        if (data.discountType === 'FIXED_AMOUNT' && data.discountValue < 0) {
            throw new Error('Fixed amount discount must be positive');
        }

        // Create promotion
        const promotion = await prisma.promotion.create({
            data: {
                code: data.code.toUpperCase(),
                name: data.name,
                description: data.description,
                discountType: data.discountType,
                discountValue: data.discountValue,
                validFrom: data.validFrom,
                validUntil: data.validUntil,
                maxUses: data.maxUses,
                currentUses: 0,
                maxPerGuest: data.maxPerGuest,
                minStayNights: data.minStayNights,
                minAmount: data.minAmount,
                roomTypes: data.roomTypes,
                propertyId: data.propertyId,
                blackoutDates: data.blackoutDates,
                combinable: data.combinable || false,
                active: true
            }
        });

        logger.info('Promotion created successfully', {
            promotionId: promotion.id,
            code: promotion.code
        });

        return this.formatPromotion(promotion);
    }

    /**
     * Get all active promotions
     */
    async getActivePromotions(propertyId?: string): Promise<Promotion[]> {
        const now = new Date();

        const promotions = await prisma.promotion.findMany({
            where: {
                active: true,
                validFrom: {
                    lte: now
                },
                validUntil: {
                    gte: now
                },
                propertyId: propertyId || undefined
            },
            orderBy: {
                validFrom: 'desc'
            }
        });

        return promotions.map(p => this.formatPromotion(p));
    }

    /**
     * Deactivate expired promotions (cron job)
     */
    async deactivateExpired(): Promise<void> {
        const now = new Date();

        logger.info('Deactivating expired promotions');

        const result = await prisma.promotion.updateMany({
            where: {
                active: true,
                validUntil: {
                    lt: now
                }
            },
            data: {
                active: false
            }
        });

        logger.info(`Deactivated ${result.count} expired promotions`);
    }
}

/**
 * Singleton instance
 */
export const promotionsEngine = new PromotionsEngine();
