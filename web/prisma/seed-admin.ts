import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createAdminUser() {
    console.log('Creating admin user...');

    const existingAdmin = await prisma.user.findUnique({
        where: { email: 'admin@hotel.com' }
    });

    if (existingAdmin) {
        console.log('Admin user already exists');
        return;
    }

    const passwordHash = await bcrypt.hash('admin123', 10);

    const admin = await prisma.user.create({
        data: {
            email: 'admin@hotel.com',
            passwordHash,
            name: 'Admin User',
            role: 'ADMIN',
            active: true
        }
    });

    console.log('✅ Admin user created:', {
        email: admin.email,
        password: 'admin123',
        role: admin.role
    });
}

createAdminUser()
    .catch((e) => {
        console.error('Error creating admin user:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
