import { UpsellRepository, upsellRepository } from '@/lib/repositories/monetization/upsell.repository';
import { CreateUpsellRuleInput } from '@/lib/schemas/monetization/upsell.schema';
import { prisma } from '@/lib/db';
import { differenceInCalendarDays } from 'date-fns'; // Still needed for transaction, or move logic to repo? 
// For now, keep simple logic in service, but use repo for queries.
// Ideally, AcceptOffer should be transactional. 
// Refactoring: Move accept logic to a transaction-enabled method or keep as is but use repo for reads.

export class UpsellService {
    constructor(private repository: UpsellRepository) { }

    async createRule(data: CreateUpsellRuleInput) {
        return this.repository.createRule(data);
    }

    async findActiveRules(propertyId: string) {
        return this.repository.findActiveRules(propertyId);
    }

    async findAllRules(propertyId: string) {
        return this.repository.findAllRules(propertyId);
    }

    async findRuleById(id: string) {
        return this.repository.findRuleById(id);
    }

    async updateRule(id: string, data: Partial<CreateUpsellRuleInput>) {
        return this.repository.updateRule(id, data);
    }

    async deleteRule(id: string) {
        return this.repository.deleteRule(id);
    }

    async generateOffers(reservationId: string) {
        // 1. Get Reservation
        const reservation = await prisma.reservation.findUnique({
            where: { id: reservationId },
            include: { roomType: true }
        });

        if (!reservation) throw new Error("Reservation not found");

        // 2. Find applicable rules
        // Match using RoomType Code, as UpsellRule uses code (e.g. 'STD')
        const rules = await this.repository.findRulesForRoom(reservation.propertyId, reservation.roomType.code);

        const nights = differenceInCalendarDays(reservation.checkOut, reservation.checkIn);

        // 3. Generate offers
        const offers = [];
        for (const rule of rules) {
            // Check minStayNights
            if (rule.minStayNights && nights < rule.minStayNights) {
                continue;
            }

            // Check if offer already exists
            const existing = await this.repository.findExistingOffer(reservationId, rule.id);

            if (!existing) {
                // Calculate price (logic remains here)
                let offerPrice = Number(rule.priceValue); // Simple MVP logic

                const offer = await this.repository.createOffer({
                    reservationId,
                    ruleId: rule.id,
                    offerPrice,
                    currency: 'USD'
                });
                offers.push(offer);
            }
        }
        return offers;
    }

    async acceptOffer(offerId: string) {
        // Transactional logic is hard to fully abstract without a UnitOfWork pattern.
        // For this refactor, we will rely on Prisma transaction here but use repo for reads?
        // Actually, mixing is bad. Let's keep the transaction here but use helper methods.

        return prisma.$transaction(async (tx) => {
            // We can't easily use 'this.repository' inside tx unless repo supports passing tx
            // For now, let's keep direct prisma usage for the transaction part to ensure atomicity,
            // or we'd need to extend repository to support transactions.
            // A simpler approach for this task: allow service to do the transaction logic directly
            // as it involves multiple entities (Offer, Reservation).

            const offer = await tx.upsellOffer.findUnique({
                where: { id: offerId },
                include: { rule: true }
            });

            if (!offer) throw new Error("Offer not found");
            if (offer.status !== 'PENDING') throw new Error("Offer already processed");

            // Apply Upgrade
            if (offer.rule.roomTypeTo) {
                const targetRoom = await tx.roomType.findUnique({
                    where: {
                        propertyId_code: {
                            propertyId: offer.rule.propertyId,
                            code: offer.rule.roomTypeTo
                        }
                    }
                });

                if (!targetRoom) throw new Error("Target room type not found");

                // Fetch reservation to get current total
                const reservation = await tx.reservation.findUnique({
                    where: { id: offer.reservationId }
                });

                if (!reservation) throw new Error("Reservation not found");

                const currentTotal = (reservation.total as any)?.amount || 0;
                const newTotal = Number(currentTotal) + Number(offer.offerPrice);

                await tx.reservation.update({
                    where: { id: offer.reservationId },
                    data: {
                        roomTypeId: targetRoom.id,
                        ratePlanCode: 'UPGRADE',
                        total: {
                            amount: newTotal,
                            currency: (reservation.total as any)?.currency || 'USD'
                        }
                    }
                });
            }

            // Update Offer
            return tx.upsellOffer.update({
                where: { id: offerId },
                data: { status: 'ACCEPTED' }
            });
        });
    }
}

export const upsellService = new UpsellService(upsellRepository);
