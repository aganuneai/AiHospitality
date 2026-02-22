import { prisma } from '@/lib/db';
import { GuestProfile } from '@prisma/client';

export interface GuestInput {
    primaryGuestName: string;
    email: string;
    phone?: string;
}

export class GuestRepository {
    async findByEmail(email: string): Promise<GuestProfile | null> {
        return prisma.guestProfile.findUnique({
            where: { email }
        });
    }

    async findById(id: string): Promise<GuestProfile | null> {
        return prisma.guestProfile.findUnique({
            where: { id }
        });
    }

    async create(guest: GuestInput): Promise<GuestProfile> {
        return prisma.guestProfile.create({
            data: {
                fullName: guest.primaryGuestName,
                email: guest.email,
                phone: guest.phone,
            }
        });
    }

    async update(id: string, guest: Partial<GuestInput>): Promise<GuestProfile> {
        return prisma.guestProfile.update({
            where: { id },
            data: {
                fullName: guest.primaryGuestName, // Update if provided
                email: guest.email,
                phone: guest.phone
            }
        });
    }

    async findOrCreate(guest: GuestInput): Promise<GuestProfile> {
        return prisma.guestProfile.upsert({
            where: { email: guest.email },
            update: {
                fullName: guest.primaryGuestName,
                phone: guest.phone,
            },
            create: {
                fullName: guest.primaryGuestName,
                email: guest.email,
                phone: guest.phone,
            }
        });
    }
}

export const guestRepository = new GuestRepository();
