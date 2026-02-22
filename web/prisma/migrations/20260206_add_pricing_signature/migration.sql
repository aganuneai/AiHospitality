-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN "pricingSignature" TEXT,
                          ADD COLUMN "quoteId" TEXT;

-- CreateIndex
CREATE INDEX "Reservation_quoteId_idx" ON "Reservation"("quoteId");

-- AddComment
COMMENT ON COLUMN "Reservation"."pricingSignature" IS 'SHA-256 hash of pricing components for Quote-Book consistency validation (anti-bait-and-switch)';
COMMENT ON COLUMN "Reservation"."quoteId" IS 'Reference to the original quote used to create this reservation';
