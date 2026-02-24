import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { name, description, maxAdults, maxChildren } = body;

        const roomType = await prisma.roomType.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(maxAdults !== undefined && { maxAdults: Number(maxAdults) }),
                ...(maxChildren !== undefined && { maxChildren: Number(maxChildren) }),
            }
        });
        return NextResponse.json(roomType);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // 1. Verificar se existem quartos físicos vinculados
        const roomsCount = await prisma.room.count({
            where: { roomTypeId: id }
        });

        if (roomsCount > 0) {
            return NextResponse.json(
                { error: `Não é possível excluir: existem ${roomsCount} quartos vinculados a este tipo.` },
                { status: 400 }
            );
        }

        // 2. Verificar se existem reservas vinculadas
        const reservationsCount = await prisma.reservation.count({
            where: { roomTypeId: id }
        });

        if (reservationsCount > 0) {
            return NextResponse.json(
                { error: `Não é possível excluir: existem ${reservationsCount} reservas vinculadas a este tipo (incluindo histórico).` },
                { status: 400 }
            );
        }

        // 3. Verificar Inventário
        const inventoryCount = await prisma.inventory.count({
            where: { roomTypeId: id }
        });

        if (inventoryCount > 0) {
            return NextResponse.json(
                { error: `Não é possível excluir: existem registros de inventário/disponibilidade para este tipo.` },
                { status: 400 }
            );
        }

        // 4. Verificar Tarifas
        const ratesCount = await prisma.rate.count({
            where: { roomTypeId: id }
        });

        if (ratesCount > 0) {
            return NextResponse.json(
                { error: `Não é possível excluir: existem tarifas configuradas para este tipo.` },
                { status: 400 }
            );
        }

        // 5. Verificar Pacotes
        const packagesCount = await prisma.package.count({
            where: { roomTypeId: id }
        });

        if (packagesCount > 0) {
            return NextResponse.json(
                { error: `Não é possível excluir: este tipo faz parte de pacotes promocionais ativos.` },
                { status: 400 }
            );
        }

        await prisma.roomType.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
