import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BookService } from '../book-service';
import { prisma } from '@/lib/db';

// Mock Prisma
vi.mock('@/lib/db', () => ({
    prisma: {
        reservation: {
            findMany: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn()
        },
        roomType: {
            findUnique: vi.fn()
        },
        inventory: {
            findMany: vi.fn(),
            updateMany: vi.fn()
        },
        guest: {
            upsert: vi.fn()
        },
        $transaction: vi.fn((callback) => callback(prisma))
    }
}));

describe('BookService', () => {
    let bookService: BookService;

    beforeEach(() => {
        bookService = new BookService();
        vi.clearAllMocks();
    });

    describe('listReservations', () => {
        it('deve retornar lista de reservas para um hotel', async () => {
            const mockReservations = [
                {
                    id: '1',
                    pnr: 'ABC123',
                    propertyId: 'hotel123',
                    guest: { fullName: 'João Silva', email: 'joao@test.com' },
                    status: 'CONFIRMED'
                }
            ];

            (prisma.reservation.findMany as any).mockResolvedValue(mockReservations);

            const result = await bookService.listReservations({ hotelId: 'hotel123' });

            expect(result).toEqual(mockReservations);
            expect(prisma.reservation.findMany).toHaveBeenCalledWith({
                where: { propertyId: 'hotel123' },
                include: { guest: true, roomType: true },
                orderBy: { createdAt: 'desc' }
            });
        });

        it('deve aplicar filtro de status quando fornecido', async () => {
            (prisma.reservation.findMany as any).mockResolvedValue([]);

            await bookService.listReservations(
                { hotelId: 'hotel123' },
                { status: 'CONFIRMED' }
            );

            expect(prisma.reservation.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        propertyId: 'hotel123',
                        status: 'CONFIRMED'
                    })
                })
            );
        });

        it('deve aplicar filtro de email quando fornecido', async () => {
            (prisma.reservation.findMany as any).mockResolvedValue([]);

            await bookService.listReservations(
                { hotelId: 'hotel123' },
                { guestEmail: 'joao@test.com' }
            );

            expect(prisma.reservation.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        guest: { email: { contains: 'joao@test.com', mode: 'insensitive' } }
                    })
                })
            );
        });
    });

    describe('createReservation', () => {
        it('deve lançar erro quando tipo de quarto não existe', async () => {
            (prisma.roomType.findUnique as any).mockResolvedValue(null);

            const request = {
                idempotencyKey: 'key123',
                quoteId: 'quote123',
                pricingSignature: 'sig123',
                stay: {
                    checkIn: '2026-06-01',
                    checkOut: '2026-06-03',
                    adults: 2,
                    children: 0
                },
                roomTypeCode: 'NONEXISTENT',
                ratePlanCode: 'BAR',
                primaryGuest: {
                    firstName: 'João',
                    lastName: 'Silva',
                    email: 'joao@test.com'
                }
            };

            await expect(
                bookService.createReservation({ hotelId: 'hotel123' }, request)
            ).rejects.toThrow('Tipo de quarto inválido ou não encontrado');
        });

        it('deve lançar erro quando inventário insuficiente', async () => {
            (prisma.roomType.findUnique as any).mockResolvedValue({
                id: 'roomtype1',
                code: 'STANDARD',
                name: 'Standard'
            });

            (prisma.inventory.findMany as any).mockResolvedValue([
                { available: 0, price: 150 },
                { available: 0, price: 150 }
            ]);

            const request = {
                idempotencyKey: 'key123',
                quoteId: 'quote123',
                pricingSignature: 'sig123',
                stay: {
                    checkIn: '2026-06-01',
                    checkOut: '2026-06-03',
                    adults: 2,
                    children: 0
                },
                roomTypeCode: 'STANDARD',
                ratePlanCode: 'BAR',
                primaryGuest: {
                    firstName: 'João',
                    lastName: 'Silva',
                    email: 'joao@test.com'
                }
            };

            await expect(
                bookService.createReservation({ hotelId: 'hotel123' }, request)
            ).rejects.toThrow('Não há disponibilidade para as datas selecionadas');
        });
    });
});
