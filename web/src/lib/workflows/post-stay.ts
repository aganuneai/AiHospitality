/**
 * Post-Stay Workflow
 * 
 * Automates guest communication after checkout:
 * - Review requests (6h after checkout)
 * - Invoice delivery
 * - Loyalty points allocation
 * - Feedback collection
 */

import { prisma } from '../db';
import { logger } from '../logger';
import { getCurrentTenantId } from '../tenancy/tenant-context';

/**
 * Loyalty points result
 */
export interface LoyaltyResult {
    pointsEarned: number;
    totalPoints: number;
    tier: string;
    nextTierPoints: number;
}

/**
 * Review request result
 */
export interface ReviewRequest {
    reviewUrl: string;
    platform: 'google' | 'tripadvisor' | 'booking' | 'internal';
    expiresAt: Date;
}

/**
 * Post-Stay Workflow Service
 */
export class PostStayWorkflow {
    private defaultHoursAfterCheckout = 6;
    private pointsPerDollar = 10; // 10 points per $1 spent

    /**
     * Send review request to guest
     * 
     * @param reservationId - Reservation ID
     * @param hoursAfterCheckout - Hours after checkout to send (default: 6)
     */
    async sendReviewRequest(
        reservationId: string,
        hoursAfterCheckout: number = this.defaultHoursAfterCheckout
    ): Promise<ReviewRequest> {
        const tenantId = getCurrentTenantId();

        logger.info('Sending review request', {
            tenantId,
            reservationId,
            hoursAfterCheckout
        });

        // Get reservation details
        const reservation = await prisma.reservation.findUnique({
            where: { id: reservationId },
            include: {
                guest: true,
                property: true,
                roomType: true
            }
        });

        if (!reservation) {
            throw new Error(`Reservation ${reservationId} not found`);
        }

        // Check if checked out
        if (reservation.status !== 'CHECKED_OUT') {
            logger.warn('Reservation not checked out yet', {
                reservationId,
                status: reservation.status
            });
            return this.createReviewRequest(reservationId, 'internal');
        }

        // Calculate send time
        const checkOutDate = new Date(reservation.checkOut);
        const sendTime = new Date(checkOutDate.getTime() + (hoursAfterCheckout * 60 * 60 * 1000));
        const now = new Date();

        if (now < sendTime) {
            logger.info('Too early to send review request, scheduling for later', {
                reservationId,
                sendTime,
                now
            });

            // TODO: Schedule job for later
            return this.createReviewRequest(reservationId, 'internal');
        }

        // Generate review token
        const reviewToken = this.generateReviewToken(reservationId);
        const reviewUrl = `${process.env.WEBSITE_URL}/review/${reviewToken}`;

        // Send email
        await this.sendReviewEmail(reservation.guest.email!, {
            guestName: reservation.guest.fullName,
            propertyName: reservation.property.name,
            checkInDate: reservation.checkIn,
            checkOutDate: reservation.checkOut,
            roomType: reservation.roomType.name,
            reviewUrl,
            confirmationNumber: reservation.pnr
        });

        logger.info('Review request sent successfully', {
            reservationId,
            email: reservation.guest.email
        });

        return this.createReviewRequest(reservationId, 'internal');
    }

    /**
     * Create review request
     */
    private createReviewRequest(
        reservationId: string,
        platform: ReviewRequest['platform']
    ): ReviewRequest {
        const reviewToken = this.generateReviewToken(reservationId);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days to review

        return {
            reviewUrl: `${process.env.WEBSITE_URL}/review/${reviewToken}`,
            platform,
            expiresAt
        };
    }

    /**
     * Generate review token
     */
    private generateReviewToken(reservationId: string): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        return Buffer.from(`${reservationId}:review:${timestamp}:${random}`).toString('base64url');
    }

    /**
     * Send review email
     */
    private async sendReviewEmail(email: string, data: any): Promise<void> {
        logger.info('Sending review email', { email, data });

        console.log(`
📧 Email to: ${email}
Subject: How was your stay at ${data.propertyName}?

Hello ${data.guestName},

Thank you for staying with us! We hope you enjoyed your time at ${data.propertyName}.

Your feedback helps us improve and helps other travelers make informed decisions.

Stay Details:
- Confirmation: ${data.confirmationNumber}
- Check-in: ${data.checkInDate.toLocaleDateString()}
- Check-out: ${data.checkOutDate.toLocaleDateString()}
- Room Type: ${data.roomType}

👉 Leave a review: ${data.reviewUrl}

As a thank you, you'll earn bonus loyalty points for completing a review!

Best regards,
${data.propertyName}
        `);
    }

    /**
     * Send invoice to guest
     * 
     * @param reservationId - Reservation ID
     */
    async sendInvoice(reservationId: string): Promise<void> {
        const tenantId = getCurrentTenantId();

        logger.info('Sending invoice', {
            tenantId,
            reservationId
        });

        // Get reservation with folio
        const reservation = await prisma.reservation.findUnique({
            where: { id: reservationId },
            include: {
                guest: true,
                property: true,
                folio: true
            }
        });

        if (!reservation) {
            throw new Error(`Reservation ${reservationId} not found`);
        }

        if (!reservation.folio) {
            throw new Error(`No folio found for reservation ${reservationId}`);
        }

        // Generate invoice PDF (mock)
        const invoiceUrl = await this.generateInvoicePDF(reservation);

        // Send email with invoice
        await this.sendInvoiceEmail(reservation.guest.email!, {
            guestName: reservation.guest.fullName,
            propertyName: reservation.property.name,
            confirmationNumber: reservation.pnr,
            invoiceUrl,
            total: reservation.folio.totals
        });

        logger.info('Invoice sent successfully', {
            reservationId,
            email: reservation.guest.email
        });
    }

    /**
     * Generate invoice PDF
     */
    private async generateInvoicePDF(reservation: any): Promise<string> {
        // In production, use PDF generation library (e.g., pdfkit, puppeteer)
        logger.info('Generating invoice PDF', {
            reservationId: reservation.id
        });

        // Mock PDF generation
        return `${process.env.WEBSITE_URL}/invoices/${reservation.id}.pdf`;
    }

    /**
     * Send invoice email
     */
    private async sendInvoiceEmail(email: string, data: any): Promise<void> {
        logger.info('Sending invoice email', { email });

        console.log(`
📧 Email to: ${email}
Subject: Invoice - ${data.confirmationNumber}

Hello ${data.guestName},

Thank you for your stay at ${data.propertyName}!

Please find your invoice attached.

Confirmation Number: ${data.confirmationNumber}
Total Amount: ${JSON.stringify(data.total)}

📄 Download Invoice: ${data.invoiceUrl}

Best regards,
${data.propertyName}
        `);
    }

    /**
     * Offer loyalty points to guest
     * 
     * @param guestId - Guest ID
     * @param stayValue - Total value of stay in dollars
     */
    async offerLoyaltyPoints(
        guestId: string,
        stayValue: number
    ): Promise<LoyaltyResult> {
        const tenantId = getCurrentTenantId();

        logger.info('Offering loyalty points', {
            tenantId,
            guestId,
            stayValue
        });

        // Calculate points earned
        const pointsEarned = Math.floor(stayValue * this.pointsPerDollar);

        // Get current guest loyalty status (mock)
        const currentPoints = await this.getCurrentLoyaltyPoints(guestId);
        const totalPoints = currentPoints + pointsEarned;

        // Determine tier
        const tier = this.calculateTier(totalPoints);
        const nextTierPoints = this.getNextTierThreshold(tier);

        // Update guest loyalty points
        await this.updateLoyaltyPoints(guestId, pointsEarned);

        // Send notification
        await this.sendLoyaltyEmail(guestId, {
            pointsEarned,
            totalPoints,
            tier,
            nextTierPoints
        });

        logger.info('Loyalty points awarded', {
            guestId,
            pointsEarned,
            totalPoints,
            tier
        });

        return {
            pointsEarned,
            totalPoints,
            tier,
            nextTierPoints
        };
    }

    /**
     * Get current loyalty points for guest
     */
    private async getCurrentLoyaltyPoints(guestId: string): Promise<number> {
        const guest = await prisma.guestProfile.findUnique({
            where: { id: guestId }
        });

        // In production, store in separate loyalty table
        return (guest?.preferences as any)?.loyaltyPoints || 0;
    }

    /**
     * Update loyalty points
     */
    private async updateLoyaltyPoints(
        guestId: string,
        pointsToAdd: number
    ): Promise<void> {
        const currentPoints = await this.getCurrentLoyaltyPoints(guestId);

        await prisma.guestProfile.update({
            where: { id: guestId },
            data: {
                preferences: {
                    loyaltyPoints: currentPoints + pointsToAdd
                }
            }
        });
    }

    /**
     * Calculate loyalty tier
     */
    private calculateTier(points: number): string {
        if (points >= 10000) return 'PLATINUM';
        if (points >= 5000) return 'GOLD';
        if (points >= 1000) return 'SILVER';
        return 'BRONZE';
    }

    /**
     * Get next tier threshold
     */
    private getNextTierThreshold(currentTier: string): number {
        switch (currentTier) {
            case 'BRONZE': return 1000;
            case 'SILVER': return 5000;
            case 'GOLD': return 10000;
            case 'PLATINUM': return 0; // Max tier
            default: return 1000;
        }
    }

    /**
     * Send loyalty email
     */
    private async sendLoyaltyEmail(guestId: string, data: LoyaltyResult): Promise<void> {
        const guest = await prisma.guestProfile.findUnique({
            where: { id: guestId }
        });

        if (!guest?.email) return;

        logger.info('Sending loyalty email', { email: guest.email });

        console.log(`
📧 Email to: ${guest.email}
Subject: You earned ${data.pointsEarned} loyalty points!

Hello ${guest.fullName},

Great news! You've earned ${data.pointsEarned} loyalty points from your recent stay.

Your Loyalty Status:
- Points Earned: ${data.pointsEarned}
- Total Points: ${data.totalPoints}
- Current Tier: ${data.tier}
- Points to Next Tier: ${data.nextTierPoints > 0 ? data.nextTierPoints : 'You\'re at the top!'}

Keep staying with us to unlock exclusive perks and benefits!

Best regards,
Your Loyalty Team
        `);
    }

    /**
     * Schedule post-stay workflows for recent checkouts
     * 
     * This should be run as a cron job (e.g., every hour)
     */
    async scheduleRecentCheckouts(): Promise<void> {
        const now = new Date();
        const pastWindow = new Date(now.getTime() - (this.defaultHoursAfterCheckout * 60 * 60 * 1000));

        logger.info('Scheduling post-stay workflows', {
            now,
            pastWindow
        });

        // Find reservations checked out within the window
        const recentCheckouts = await prisma.reservation.findMany({
            where: {
                checkOut: {
                    gte: pastWindow,
                    lte: now
                },
                status: 'CHECKED_OUT'
            },
            include: {
                guest: true,
                folio: true
            }
        });

        logger.info(`Found ${recentCheckouts.length} recent checkouts`);

        // Process each checkout
        for (const reservation of recentCheckouts) {
            try {
                // Send invoice
                if (reservation.folio) {
                    await this.sendInvoice(reservation.id);
                }

                // Send review request
                await this.sendReviewRequest(reservation.id);

                // Award loyalty points
                const total = typeof reservation.total === 'object' && reservation.total !== null
                    ? (reservation.total as any).amount
                    : 0;

                if (total > 0) {
                    await this.offerLoyaltyPoints(reservation.guestId, total);
                }

            } catch (error: any) {
                logger.error('Failed to process checkout', {
                    reservationId: reservation.id,
                    error: error.message
                });
            }
        }
    }
}

/**
 * Singleton instance
 */
export const postStayWorkflow = new PostStayWorkflow();
