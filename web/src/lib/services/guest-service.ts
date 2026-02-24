import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export class GuestService {

    /**
     * Search guests by name, email, or document.
     * @param query Search string
     * @param limit Max results (default 10)
     */
    async search(query: string, limit = 10) {
        if (!query || query.length < 2) return [];

        // Search in main text fields + phone
        // Note: Full JSON partial matching in Prisma is database-dependent.
        // We prioritize core identity fields.
        const guests = await prisma.guestProfile.findMany({
            where: {
                OR: [
                    { fullName: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } },
                    { phone: { contains: query, mode: 'insensitive' } },
                ]
            },
            take: limit,
            orderBy: { updatedAt: 'desc' },
            select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                document: true,
                preferences: true,
                updatedAt: true
            }
        });

        // Map to robust structure for admin search results
        return guests.map(g => {
            const doc = g.document as any;
            const [firstName, ...rest] = g.fullName.split(' ');
            return {
                id: g.id,
                fullName: g.fullName,
                firstName: firstName,
                lastName: rest.join(' '),
                email: g.email || '',
                phone: g.phone || '',
                documentId: doc?.number || '',
                documentType: doc?.type || '',
                lastUpdated: g.updatedAt,
                // Meta fields for UI differentiation
                displayText: `${g.fullName} ${doc?.number ? `(${doc.number})` : ''}`.trim()
            };
        });
    }

    /**
     * List guests with pagination.
     */
    async list(params: { limit: number; offset: number }) {
        const [guests, total] = await Promise.all([
            prisma.guestProfile.findMany({
                take: params.limit,
                skip: params.offset,
                orderBy: { updatedAt: 'desc' },
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    phone: true,
                    document: true,
                    updatedAt: true
                }
            }),
            prisma.guestProfile.count()
        ]);

        return {
            guests: guests.map(g => {
                const doc = g.document as any;
                return {
                    id: g.id,
                    fullName: g.fullName,
                    email: g.email || '',
                    phone: g.phone || '',
                    documentId: doc?.number || '',
                    documentType: doc?.type || '',
                    updatedAt: g.updatedAt
                };
            }),
            total
        };
    }

    /**
     * Get a single guest by ID with full details.
     */
    async getById(id: string) {
        return prisma.guestProfile.findUnique({
            where: { id },
            include: {
                reservations: {
                    take: 5,
                    orderBy: { checkIn: 'desc' },
                    select: {
                        id: true,
                        pnr: true,
                        status: true,
                        checkIn: true,
                        checkOut: true,
                        total: true
                    }
                }
            }
        });
    }

    /**
     * Update guest profile data.
     */
    async update(id: string, data: {
        fullName?: string;
        email?: string;
        phone?: string;
        document?: any;
        preferences?: any;
        dateOfBirth?: string | Date | null;
        language?: string;
        nationality?: string;
        marketCode?: string;
        active?: boolean;
        doNotDisturb?: boolean;
        noPost?: boolean;
        loyaltyTier?: string;
        loyaltyPoints?: number;
    }) {
        const { dateOfBirth, ...rest } = data;
        return prisma.guestProfile.update({
            where: { id },
            data: {
                ...rest,
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
                updatedAt: new Date()
            }
        });
    }

    /**
     * Find or create a guest based on unique identifiers (Email).
     */
    async findOrCreate(data: {
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        documentId?: string;
        documentType?: string;
    }) {
        const fullName = `${data.firstName} ${data.lastName}`.trim();

        // Try to find by email
        let guest = await prisma.guestProfile.findUnique({
            where: { email: data.email }
        });

        const docPayload = data.documentId ? { type: data.documentType || 'passport', number: data.documentId } : undefined;

        if (guest) {
            // Update phone/doc if provided and missing in DB
            return prisma.guestProfile.update({
                where: { id: guest.id },
                data: {
                    phone: data.phone || guest.phone,
                    document: (data.documentId && !guest.document) ? (docPayload as any) : (guest.document as any)
                }
            });
        }

        // Create new
        return prisma.guestProfile.create({
            data: {
                fullName,
                email: data.email,
                phone: data.phone,
                document: docPayload ? (docPayload as any) : (Prisma.JsonNull as any)
            }
        });
    }
}

export const guestService = new GuestService();

