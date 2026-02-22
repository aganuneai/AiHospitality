import { prisma } from '@/lib/db';
import { CreateUpsellRuleInput } from '@/lib/schemas/monetization/upsell.schema';

export class UpsellRepository {
    async createRule(data: CreateUpsellRuleInput) {
        return prisma.upsellRule.create({ data });
    }

    async findActiveRules(propertyId: string) {
        return prisma.upsellRule.findMany({
            where: { propertyId, active: true },
            include: { offers: true }
        });
    }

    async findAllRules(propertyId: string) {
        return prisma.upsellRule.findMany({
            where: { propertyId },
            include: { offers: true },
            orderBy: { createdAt: 'desc' }
        });
    }

    async findRulesForRoom(propertyId: string, roomTypeId: string) {
        return prisma.upsellRule.findMany({
            where: {
                propertyId,
                active: true,
                OR: [
                    { roomTypeFrom: null },
                    { roomTypeFrom: roomTypeId }
                ]
            }
        });
    }

    async findRuleById(id: string) {
        return prisma.upsellRule.findUnique({
            where: { id }
        });
    }

    async updateRule(id: string, data: Partial<CreateUpsellRuleInput>) {
        return prisma.upsellRule.update({
            where: { id },
            data
        });
    }

    async deleteRule(id: string) {
        return prisma.upsellRule.delete({
            where: { id }
        });
    }

    async findOffer(offerId: string) {
        return prisma.upsellOffer.findUnique({
            where: { id: offerId },
            include: { rule: true }
        });
    }

    async createOffer(data: { reservationId: string, ruleId: string, offerPrice: number, currency: string }) {
        // Security Check: Ensure Rule and Reservation belong to same Property
        const rule = await prisma.upsellRule.findUnique({ where: { id: data.ruleId } });
        const reservation = await prisma.reservation.findUnique({ where: { id: data.reservationId } });

        if (!rule || !reservation) throw new Error("Rule or Reservation not found");

        if (rule.propertyId !== reservation.propertyId) {
            throw new Error("Security Violation: Cannot offer upsell from different property configuration.");
        }

        return prisma.upsellOffer.create({
            data: {
                ...data,
                status: 'PENDING'
            }
        });
    }

    async findExistingOffer(reservationId: string, ruleId: string) {
        return prisma.upsellOffer.findFirst({
            where: { reservationId, ruleId }
        });
    }

    async updateOfferStatus(offerId: string, status: 'ACCEPTED' | 'REJECTED') {
        return prisma.upsellOffer.update({
            where: { id: offerId },
            data: { status }
        });
    }
}

export const upsellRepository = new UpsellRepository();
