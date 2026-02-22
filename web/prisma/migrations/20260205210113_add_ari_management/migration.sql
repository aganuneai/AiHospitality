/*
  Warnings:

  - Added the required column `dateRange` to the `AriEvent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roomTypeCode` to the `AriEvent` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AriEvent" ADD COLUMN     "channelCode" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "dateRange" JSONB NOT NULL,
ADD COLUMN     "ratePlanCode" TEXT,
ADD COLUMN     "roomTypeCode" TEXT NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "processedAt" DROP NOT NULL,
ALTER COLUMN "processedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Restriction" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "closedToArrival" BOOLEAN NOT NULL DEFAULT false,
    "closedToDeparture" BOOLEAN NOT NULL DEFAULT false,
    "minLOS" INTEGER,
    "maxLOS" INTEGER,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Restriction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Restriction_propertyId_date_idx" ON "Restriction"("propertyId", "date");

-- CreateIndex
CREATE INDEX "Restriction_roomTypeId_date_idx" ON "Restriction"("roomTypeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Restriction_propertyId_roomTypeId_date_key" ON "Restriction"("propertyId", "roomTypeId", "date");

-- CreateIndex
CREATE INDEX "AriEvent_propertyId_status_idx" ON "AriEvent"("propertyId", "status");

-- CreateIndex
CREATE INDEX "AriEvent_occurredAt_idx" ON "AriEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "AriEvent_eventType_idx" ON "AriEvent"("eventType");
