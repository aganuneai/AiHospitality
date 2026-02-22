/*
  Warnings:

  - You are about to drop the `WebhookDelivery` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WebhookSubscription` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[email]` on the table `GuestProfile` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "WebhookDelivery" DROP CONSTRAINT "WebhookDelivery_subscriptionId_fkey";

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "action" TEXT,
ADD COLUMN     "changes" JSONB,
ADD COLUMN     "entityId" TEXT,
ADD COLUMN     "entityType" TEXT,
ADD COLUMN     "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "agencyId" TEXT,
ADD COLUMN     "bookerDetails" JSONB,
ADD COLUMN     "campaign" TEXT,
ADD COLUMN     "channelId" TEXT,
ADD COLUMN     "commission" DECIMAL(10,2),
ADD COLUMN     "groupId" TEXT,
ADD COLUMN     "guaranteeType" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "packageId" TEXT,
ADD COLUMN     "pricingType" TEXT NOT NULL DEFAULT 'GROSS',
ADD COLUMN     "roomId" TEXT,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "tags" TEXT[];

-- AlterTable
ALTER TABLE "Restriction" ADD COLUMN     "stopSell" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "WebhookDelivery";

-- DropTable
DROP TABLE "WebhookSubscription";

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "country" TEXT,
    "commission" DECIMAL(5,2),
    "contractRef" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CLEAN',
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomMaintenance" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "assignedTo" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomMaintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rate" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "ratePlanCode" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReservationGuest" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "age" INTEGER,
    "isRepresentative" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReservationGuest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Channel" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "distributionMode" TEXT,
    "modeLockedAt" TIMESTAMP(3),
    "modeChangedBy" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "appKey" TEXT,
    "provisionedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParityCheck" (
    "id" TEXT NOT NULL,
    "channelAId" TEXT NOT NULL,
    "channelBId" TEXT NOT NULL,
    "channelBCode" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "ratePlanId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "rateA" DECIMAL(10,2) NOT NULL,
    "rateB" DECIMAL(10,2) NOT NULL,
    "rateDiff" DECIMAL(10,2) NOT NULL,
    "rateDiffPct" DECIMAL(5,2) NOT NULL,
    "inventoryA" INTEGER NOT NULL,
    "inventoryB" INTEGER NOT NULL,
    "inventoryDiff" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParityCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ARIUpdate" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "ARIUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupBlock" (
    "id" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "roomCount" INTEGER NOT NULL,
    "pickedUp" INTEGER NOT NULL DEFAULT 0,
    "checkIn" DATE NOT NULL,
    "checkOut" DATE NOT NULL,
    "cutoffDate" DATE NOT NULL,
    "ratePerNight" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "contactName" TEXT,
    "contactEmail" TEXT,
    "released" BOOLEAN NOT NULL DEFAULT false,
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "discountType" TEXT NOT NULL,
    "discountValue" DECIMAL(10,2) NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "maxUses" INTEGER,
    "currentUses" INTEGER NOT NULL DEFAULT 0,
    "maxPerGuest" INTEGER,
    "minStayNights" INTEGER,
    "minAmount" DECIMAL(10,2),
    "roomTypes" TEXT[],
    "propertyId" TEXT,
    "blackoutDates" TIMESTAMP(3)[],
    "combinable" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpsellRule" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roomTypeFrom" TEXT,
    "minStayNights" INTEGER,
    "roomTypeTo" TEXT,
    "serviceId" TEXT,
    "priceType" TEXT NOT NULL,
    "priceValue" DECIMAL(10,2) NOT NULL,
    "propertyId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UpsellRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpsellOffer" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "offerPrice" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UpsellOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Package" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "roomTypeId" TEXT NOT NULL,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "discountPct" DECIMAL(5,2) NOT NULL,
    "finalPrice" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "minStayNights" INTEGER DEFAULT 1,
    "propertyId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageItem" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "postingPattern" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackageItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentSplit" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "payers" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentSplit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAuthorization" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "splitId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL,
    "cardToken" TEXT NOT NULL,
    "cardLast4" TEXT NOT NULL,
    "cardBrand" TEXT NOT NULL,
    "authorizationCode" TEXT,
    "authorizedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "capturedAmount" DECIMAL(10,2),
    "capturedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "refundedAmount" DECIMAL(10,2),
    "refundedAt" TIMESTAMP(3),
    "processorTransactionId" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentAuthorization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Partner_propertyId_type_idx" ON "Partner"("propertyId", "type");

-- CreateIndex
CREATE INDEX "Partner_active_idx" ON "Partner"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_propertyId_code_key" ON "Partner"("propertyId", "code");

-- CreateIndex
CREATE INDEX "Room_roomTypeId_idx" ON "Room"("roomTypeId");

-- CreateIndex
CREATE INDEX "Room_status_idx" ON "Room"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Room_propertyId_name_key" ON "Room"("propertyId", "name");

-- CreateIndex
CREATE INDEX "RoomMaintenance_roomId_status_idx" ON "RoomMaintenance"("roomId", "status");

-- CreateIndex
CREATE INDEX "Rate_propertyId_date_idx" ON "Rate"("propertyId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Rate_propertyId_roomTypeId_date_ratePlanCode_key" ON "Rate"("propertyId", "roomTypeId", "date", "ratePlanCode");

-- CreateIndex
CREATE UNIQUE INDEX "Channel_code_key" ON "Channel"("code");

-- CreateIndex
CREATE INDEX "Channel_distributionMode_idx" ON "Channel"("distributionMode");

-- CreateIndex
CREATE INDEX "Channel_active_idx" ON "Channel"("active");

-- CreateIndex
CREATE INDEX "ParityCheck_propertyId_date_idx" ON "ParityCheck"("propertyId", "date");

-- CreateIndex
CREATE INDEX "ParityCheck_status_idx" ON "ParityCheck"("status");

-- CreateIndex
CREATE INDEX "ParityCheck_channelAId_channelBCode_idx" ON "ParityCheck"("channelAId", "channelBCode");

-- CreateIndex
CREATE INDEX "ParityCheck_checkedAt_idx" ON "ParityCheck"("checkedAt");

-- CreateIndex
CREATE INDEX "ARIUpdate_channelId_status_idx" ON "ARIUpdate"("channelId", "status");

-- CreateIndex
CREATE INDEX "ARIUpdate_propertyId_date_idx" ON "ARIUpdate"("propertyId", "date");

-- CreateIndex
CREATE INDEX "ARIUpdate_status_createdAt_idx" ON "ARIUpdate"("status", "createdAt");

-- CreateIndex
CREATE INDEX "GroupBlock_propertyId_checkIn_idx" ON "GroupBlock"("propertyId", "checkIn");

-- CreateIndex
CREATE INDEX "GroupBlock_released_cutoffDate_idx" ON "GroupBlock"("released", "cutoffDate");

-- CreateIndex
CREATE UNIQUE INDEX "Promotion_code_key" ON "Promotion"("code");

-- CreateIndex
CREATE INDEX "Promotion_code_idx" ON "Promotion"("code");

-- CreateIndex
CREATE INDEX "Promotion_active_validFrom_validUntil_idx" ON "Promotion"("active", "validFrom", "validUntil");

-- CreateIndex
CREATE UNIQUE INDEX "UpsellRule_code_key" ON "UpsellRule"("code");

-- CreateIndex
CREATE INDEX "UpsellOffer_reservationId_idx" ON "UpsellOffer"("reservationId");

-- CreateIndex
CREATE INDEX "UpsellOffer_status_idx" ON "UpsellOffer"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Package_code_key" ON "Package"("code");

-- CreateIndex
CREATE INDEX "Package_code_idx" ON "Package"("code");

-- CreateIndex
CREATE INDEX "Package_active_validFrom_validUntil_idx" ON "Package"("active", "validFrom", "validUntil");

-- CreateIndex
CREATE INDEX "Package_propertyId_idx" ON "Package"("propertyId");

-- CreateIndex
CREATE INDEX "PaymentAuthorization_reservationId_idx" ON "PaymentAuthorization"("reservationId");

-- CreateIndex
CREATE INDEX "PaymentAuthorization_status_expiresAt_idx" ON "PaymentAuthorization"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "GuestProfile_email_key" ON "GuestProfile"("email");

-- CreateIndex
CREATE INDEX "Reservation_channelId_idx" ON "Reservation"("channelId");

-- CreateIndex
CREATE INDEX "Reservation_groupId_idx" ON "Reservation"("groupId");

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomMaintenance" ADD CONSTRAINT "RoomMaintenance_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rate" ADD CONSTRAINT "Rate_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rate" ADD CONSTRAINT "Rate_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationGuest" ADD CONSTRAINT "ReservationGuest_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParityCheck" ADD CONSTRAINT "ParityCheck_channelAId_fkey" FOREIGN KEY ("channelAId") REFERENCES "Channel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ARIUpdate" ADD CONSTRAINT "ARIUpdate_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpsellRule" ADD CONSTRAINT "UpsellRule_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpsellOffer" ADD CONSTRAINT "UpsellOffer_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpsellOffer" ADD CONSTRAINT "UpsellOffer_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "UpsellRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Package" ADD CONSTRAINT "Package_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Package" ADD CONSTRAINT "Package_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageItem" ADD CONSTRAINT "PackageItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSplit" ADD CONSTRAINT "PaymentSplit_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAuthorization" ADD CONSTRAINT "PaymentAuthorization_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAuthorization" ADD CONSTRAINT "PaymentAuthorization_splitId_fkey" FOREIGN KEY ("splitId") REFERENCES "PaymentSplit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
