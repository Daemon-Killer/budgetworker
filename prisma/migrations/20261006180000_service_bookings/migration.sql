CREATE TABLE "ServiceBooking" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serviceSlug" TEXT NOT NULL,
    "serviceTitle" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "months" INTEGER NOT NULL,
    "priceInr" INTEGER NOT NULL,
    "replacements" INTEGER NOT NULL,
    "testMode" BOOLEAN NOT NULL DEFAULT false,
    "answers" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "orderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceBooking_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ServiceBooking_requestId_key" ON "ServiceBooking"("requestId");
CREATE UNIQUE INDEX "ServiceBooking_orderId_key" ON "ServiceBooking"("orderId");
CREATE INDEX "ServiceBooking_userId_createdAt_idx" ON "ServiceBooking"("userId", "createdAt");
ALTER TABLE "ServiceBooking" ADD CONSTRAINT "ServiceBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceBooking" ADD CONSTRAINT "ServiceBooking_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
