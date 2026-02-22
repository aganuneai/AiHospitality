import { prisma } from "@/lib/db";

/**
 * Garante que a Property padrão de desenvolvimento existe no banco.
 * Usado como guard em rotas de criação de cadastros.
 */
export async function ensureProperty(propertyId: string): Promise<void> {
    await prisma.property.upsert({
        where: { id: propertyId },
        update: {},
        create: {
            id: propertyId,
            code: propertyId,
            name: "AiHospitality Demo",
            timeZone: "America/Sao_Paulo",
        },
    });
}
