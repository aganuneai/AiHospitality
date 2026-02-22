const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const propertyId = "PROP-001"

    // Ensure Property Exists
    const property = await prisma.property.upsert({
        where: { code: "HOTEL-01" },
        update: {},
        create: {
            id: propertyId,
            name: "Grand Hotel",
            code: "HOTEL-01",
            timeZone: "America/Sao_Paulo"
        }
    })

    // Seed Room Types
    const types = [
        { code: "STD", name: "Standard Room", description: "Cozy standard room" },
        { code: "DLX", name: "Deluxe Suite", description: "Spacious suite with view" },
        { code: "PRE", name: "Presidential", description: "Top luxury experience" }
    ]

    for (const t of types) {
        await prisma.roomType.upsert({
            where: { propertyId_code: { propertyId, code: t.code } },
            update: {},
            create: {
                propertyId,
                code: t.code,
                name: t.name,
                description: t.description
            }
        })
    }

    console.log("Seeding complete: Room Types created.")
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
