import { prisma } from '@/lib/db';
import { User } from '@prisma/client';

export class UserRepository {
    async findByEmail(email: string): Promise<User | null> {
        return prisma.user.findUnique({
            where: { email }
        });
    }

    async findById(id: string): Promise<User | null> {
        return prisma.user.findUnique({
            where: { id }
        });
    }

    async create(data: any): Promise<User> {
        return prisma.user.create({
            data
        });
    }

    async update(id: string, data: any): Promise<User> {
        return prisma.user.update({
            where: { id },
            data
        });
    }

    async listActive(): Promise<User[]> {
        return prisma.user.findMany({
            where: { active: true }
        });
    }
}

export const userRepository = new UserRepository();
