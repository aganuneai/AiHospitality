-- Create Webhook Subscription table
CREATE TABLE "WebhookSubscription" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" TEXT[] NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookSubscription_pkey" PRIMARY KEY ("id")
);

-- Create Webhook Delivery table
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttempt" TIMESTAMP(3),
    "nextRetry" TIMESTAMP(3),
    "response" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "WebhookSubscription_hotelId_idx" ON "WebhookSubscription"("hotelId");
CREATE INDEX "WebhookSubscription_active_idx" ON "WebhookSubscription"("active");
CREATE INDEX "WebhookDelivery_subscriptionId_idx" ON "WebhookDelivery"("subscriptionId");
CREATE INDEX "WebhookDelivery_eventId_idx" ON "WebhookDelivery"("eventId");
CREATE INDEX "WebhookDelivery_status_idx" ON "WebhookDelivery"("status");
CREATE INDEX "WebhookDelivery_nextRetry_idx" ON "WebhookDelivery"("nextRetry");

-- Add foreign key
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_subscriptionId_fkey" 
    FOREIGN KEY ("subscriptionId") REFERENCES "WebhookSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
