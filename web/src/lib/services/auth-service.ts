import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { userRepository, UserRepository } from '@/lib/repositories/identity/user.repository';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

export interface UserPayload {
    id: string;
    email: string;
    name: string;
    role: string;
}

export class AuthService {
    constructor(
        private userRepo: UserRepository = userRepository
    ) { }

    /**
     * Authenticate user with email and password
     */
    async login(email: string, password: string): Promise<{ user: UserPayload; token: string } | null> {
        const user = await this.userRepo.findByEmail(email);

        if (!user || !user.active) {
            return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            return null;
        }

        const payload: UserPayload = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        };

        const token = await new SignJWT(payload as any)
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('24h')
            .sign(JWT_SECRET);

        return { user: payload, token };
    }

    /**
     * Verify JWT token and return payload
     */
    async verifyToken(token: string): Promise<UserPayload | null> {
        try {
            const { payload } = await jwtVerify(token, JWT_SECRET);
            return payload as unknown as UserPayload;
        } catch (error) {
            return null;
        }
    }

    /**
     * Create a new user (admin only)
     */
    async createUser(
        email: string,
        password: string,
        name: string,
        role: string = 'STAFF'
    ) {
        const passwordHash = await bcrypt.hash(password, 10);

        return await this.userRepo.create({
            email,
            passwordHash,
            name,
            role,
        });
    }

    /**
     * Get user from token (for middleware)
     */
    async getUserFromRequest(authHeader: string | null): Promise<UserPayload | null> {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }

        const token = authHeader.substring(7);
        return await this.verifyToken(token);
    }
}

export const authService = new AuthService();
