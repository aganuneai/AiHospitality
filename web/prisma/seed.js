"use strict";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const hotelId = "HOTEL_001";
  await prisma.property.upsert({
    where: { id: hotelId },
    update: {},
    create: {
      id: hotelId,
      code: hotelId,
      name: "Grand Hotel Monitor",
      timeZone: "America/Sao_Paulo"
    }
  });
  const roomCode = "DLX";
  const roomType = await prisma.roomType.upsert({
    where: { propertyId_code: { propertyId: hotelId, code: roomCode } },
    update: {},
    create: {
      code: roomCode,
      name: "Deluxe Ocean View",
      maxAdults: 2,
      propertyId: hotelId
    }
  });
  const ratePlanCode = "BAR";
  await prisma.ratePlan.upsert({
    where: { propertyId_code: { propertyId: hotelId, code: ratePlanCode } },
    update: {},
    create: {
      code: ratePlanCode,
      name: "Best Available Rate",
      propertyId: hotelId
    }
  });
  const today = /* @__PURE__ */ new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const existing = await prisma.inventory.findFirst({
      where: {
        propertyId: hotelId,
        roomTypeId: roomType.id,
        date
      }
    });
    if (!existing) {
      await prisma.inventory.create({
        data: {
          propertyId: hotelId,
          roomTypeId: roomType.id,
          date,
          total: 10,
          // Added total
          available: 10
        }
      });
    }
  }
  console.log("Seed completed!");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
