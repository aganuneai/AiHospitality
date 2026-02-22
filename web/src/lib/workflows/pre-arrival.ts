/**
 * Pre-Arrival Workflow
 * 
 * Automates guest communication and preparation before arrival:
 * - Digital check-in links (24h before arrival)
 * - Guest information collection
 * - Room assignment based on preferences
 * - Deposit/pre-payment processing
 */

import { prisma } from '../db';
import { logger } from '../logger';
import { getCurrentTenantId } from '../tenancy/tenant-context';

/**
 * Guest information collected during pre-arrival
 */
export interface GuestInfo {
    fullName: string;
    email: string;
    phone: string;
    document: {
        type: string;       // passport, id, driver_license
        number: string;
        country: string;
        expiryDate?: Date;
    };
    preferences: {
        language?: string;
        smoking?: boolean;
        floor?: 'low' | 'high';
        bedType?: 'king' | 'queen' | 'twin';
        pillowType?: string;
        specialRequests?: string;
    };
    arrivalTime?: string;
    flightNumber?: string;
}

/**
 * Room assignment result
 */
export interface AssignedRoom {
    roomNumber: string;
    floor: number;
    features: string[];
    checkInTime: Date;
}

/**
 * Payment result
 */
export interface PaymentResult {
    transactionId: string;
    amount: number;
    currency: string;
    status: 'authorized' | 'captured' | 'failed';
    method: string;
}

/**
 * Pre-Arrival Workflow Service
 */
export class PreArrivalWorkflow {
    private defaultHoursBeforeArrival = 24;

    /**
     * Send digital check-in link to guest
     * 
     * @param reservationId - Reservation ID
     * @param hoursBeforeArrival - Hours before check-in to send (default: 24)
     */
    async sendDigitalCheckInLink(
        reservationId: string,
        hoursBeforeArrival: number = this.defaultHoursBeforeArrival
    ): Promise<void> {
        const tenantId = getCurrentTenantId();

        logger.info('Sending digital check-in link', {
            tenantId,
            reservationId,
            hoursBeforeArrival
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

        // Check if already checked in
        if (reservation.status === 'CHECKED_IN') {
            logger.info('Guest already checked in, skipping', { reservationId });
            return;
        }

        // Calculate send time
        const checkInDate = new Date(reservation.checkIn);
        const sendTime = new Date(checkInDate.getTime() - (hoursBeforeArrival * 60 * 60 * 1000));
        const now = new Date();

        if (now < sendTime) {
            logger.info('Too early to send, scheduling for later', {
                reservationId,
                sendTime,
                now
            });

            // TODO: Schedule job for later
            return;
        }

        // Generate check-in token
        const checkInToken = this.generateCheckInToken(reservationId);
        const checkInUrl = `${process.env.WEBSITE_URL}/check-in/${checkInToken}`;

        // Send email
        await this.sendCheckInEmail(reservation.guest.email!, {
            guestName: reservation.guest.fullName,
            propertyName: reservation.property.name,
            checkInDate: reservation.checkIn,
            checkOutDate: reservation.checkOut,
            roomType: reservation.roomType.name,
            checkInUrl,
            confirmationNumber: reservation.pnr
        });

        // Update reservation
        await prisma.reservation.update({
            where: { id: reservationId },
            data: {
                // Store check-in token in metadata
                // In production, use a separate table
            }
        });

        logger.info('Digital check-in link sent successfully', {
            reservationId,
            email: reservation.guest.email
        });
    }

    /**
     * Generate secure check-in token
     */
    private generateCheckInToken(reservationId: string): string {
        // In production, use crypto for secure token
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        return Buffer.from(`${reservationId}:${timestamp}:${random}`).toString('base64url');
    }

    /**
     * Send check-in email
     */
    private async sendCheckInEmail(email: string, data: any): Promise<void> {
        // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
        logger.info('Sending check-in email', { email, data });

        // Mock email sending
        console.log(`
📧 Email to: ${email}
Subject: Digital Check-In - ${data.propertyName}

Hello ${data.guestName},

Your stay is almost here! Check in online now and save time at arrival.

Reservation Details:
- Confirmation: ${data.confirmationNumber}
- Check-in: ${data.checkInDate.toLocaleDateString()}
- Check-out: ${data.checkOutDate.toLocaleDateString()}
- Room Type: ${data.roomType}

👉 Complete your check-in: ${data.checkInUrl}

See you soon!
${data.propertyName}
        `);
    }

    /**
     * Collect guest information from digital check-in form
     * 
     * @param reservationId - Reservation ID
     * @param info - Guest information
     */
    async collectGuestInfo(
        reservationId: string,
        info: GuestInfo
    ): Promise<GuestInfo> {
        const tenantId = getCurrentTenantId();

        logger.info('Collecting guest information', {
            tenantId,
            reservationId
        });

        // Validate guest info
        this.validateGuestInfo(info);

        // Update guest profile
        const reservation = await prisma.reservation.findUnique({
            where: { id: reservationId },
            include: { guest: true }
        });

        if (!reservation) {
            throw new Error(`Reservation ${reservationId} not found`);
        }

        await prisma.guestProfile.update({
            where: { id: reservation.guestId },
            data: {
                fullName: info.fullName,
                email: info.email,
                phone: info.phone,
                document: info.document,
                preferences: info.preferences
            }
        });

        // Store arrival details
        await prisma.reservation.update({
            where: { id: reservationId },
            data: {
                // Store arrival time, flight number in metadata
                status: 'CONFIRMED'
            }
        });

        logger.info('Guest information collected successfully', {
            reservationId,
            guestId: reservation.guestId
        });

        return info;
    }

    /**
     * Validate guest information
     */
    private validateGuestInfo(info: GuestInfo): void {
        if (!info.fullName || info.fullName.trim().length < 2) {
            throw new Error('Full name is required');
        }

        if (!info.email || !this.isValidEmail(info.email)) {
            throw new Error('Valid email is required');
        }

        if (!info.document || !info.document.number) {
            throw new Error('Document information is required');
        }

        // Additional validations...
    }

    /**
     * Validate email format
     */
    private isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Assign room to guest based on preferences
     * 
     * @param reservationId - Reservation ID
     * @param preferences - Room preferences
     */
    async assignRoom(
        reservationId: string,
        preferences?: GuestInfo['preferences']
    ): Promise<AssignedRoom> {
        const tenantId = getCurrentTenantId();

        logger.info('Assigning room to guest', {
            tenantId,
            reservationId,
            preferences
        });

        const reservation = await prisma.reservation.findUnique({
            where: { id: reservationId },
            include: {
                guest: true,
                roomType: true,
                property: true
            }
        });

        if (!reservation) {
            throw new Error(`Reservation ${reservationId} not found`);
        }

        // Get merged preferences (from check-in + profile)
        const guestPrefs = {
            ...(reservation.guest.preferences as object ?? {}),
            ...preferences
        };

        // Find best matching room
        const assignedRoom = await this.findBestRoom(
            reservation.property.id,
            reservation.roomType.id,
            reservation.checkIn,
            reservation.checkOut,
            guestPrefs
        );

        // Update reservation with room assignment
        await prisma.reservation.update({
            where: { id: reservationId },
            data: {
                // Store room assignment in metadata
                status: 'CONFIRMED'
            }
        });

        logger.info('Room assigned successfully', {
            reservationId,
            roomNumber: assignedRoom.roomNumber
        });

        return assignedRoom;
    }

    /**
     * Find best matching room based on preferences
     */
    private async findBestRoom(
        propertyId: string,
        roomTypeId: string,
        checkIn: Date,
        checkOut: Date,
        preferences: any
    ): Promise<AssignedRoom> {
        // In production, query actual room inventory
        // For now, mock room assignment

        const floor = preferences?.floor === 'high' ?
            Math.floor(Math.random() * 5) + 6 :  // Floors 6-10
            Math.floor(Math.random() * 5) + 1;   // Floors 1-5

        const roomNumber = `${floor}${String(Math.floor(Math.random() * 20) + 1).padStart(2, '0')}`;

        const features: string[] = [
            preferences?.bedType || 'king',
            preferences?.smoking ? 'smoking' : 'non-smoking'
        ];

        if (preferences?.floor === 'high') {
            features.push('city view');
        }

        return {
            roomNumber,
            floor,
            features,
            checkInTime: checkIn
        };
    }

    /**
     * Process deposit/pre-payment
     * 
     * @param reservationId - Reservation ID
     * @param paymentMethod - Payment method token
     */
    async processDeposit(
        reservationId: string,
        paymentMethod?: string
    ): Promise<PaymentResult> {
        const tenantId = getCurrentTenantId();

        logger.info('Processing deposit', {
            tenantId,
            reservationId
        });

        const reservation = await prisma.reservation.findUnique({
            where: { id: reservationId },
            include: {
                property: true
            }
        });

        if (!reservation) {
            throw new Error(`Reservation ${reservationId} not found`);
        }

        // Calculate deposit amount (e.g., first night or full amount)
        const total = typeof reservation.total === 'object' && reservation.total !== null
            ? (reservation.total as any).amount
            : 0;

        const depositAmount = total; // Full prepayment for simplicity

        // Process payment (mock)
        const result: PaymentResult = {
            transactionId: `txn_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            amount: depositAmount,
            currency: 'USD',
            status: 'authorized',
            method: paymentMethod || 'credit_card'
        };

        // Update reservation
        await prisma.reservation.update({
            where: { id: reservationId },
            data: {
                status: 'PREPAID'
            }
        });

        logger.info('Deposit processed successfully', {
            reservationId,
            transactionId: result.transactionId,
            amount: result.amount
        });

        return result;
    }

    /**
     * Schedule pre-arrival workflows for upcoming reservations
     * 
     * This should be run as a cron job (e.g., every hour)
     */
    async scheduleUpcomingCheckIns(): Promise<void> {
        const now = new Date();
        const futureWindow = new Date(now.getTime() + (this.defaultHoursBeforeArrival * 60 * 60 * 1000));

        logger.info('Scheduling pre-arrival workflows', {
            now,
            futureWindow
        });

        // Find reservations checking in within the window
        const upcomingReservations = await prisma.reservation.findMany({
            where: {
                checkIn: {
                    gte: now,
                    lte: futureWindow
                },
                status: {
                    in: ['CONFIRMED', 'PENDING']
                }
            },
            include: {
                guest: true
            }
        });

        logger.info(`Found ${upcomingReservations.length} upcoming reservations`);

        // Send check-in links
        for (const reservation of upcomingReservations) {
            try {
                await this.sendDigitalCheckInLink(reservation.id);
            } catch (error: any) {
                logger.error('Failed to send check-in link', {
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
export const preArrivalWorkflow = new PreArrivalWorkflow();
