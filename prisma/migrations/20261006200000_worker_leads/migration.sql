CREATE TABLE "WorkerLead" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "area" TEXT NOT NULL,
  "details" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkerLead_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WorkerLead_requestId_key" ON "WorkerLead"("requestId");
CREATE INDEX "WorkerLead_createdAt_idx" ON "WorkerLead"("createdAt");
CREATE INDEX "WorkerLead_phone_createdAt_idx" ON "WorkerLead"("phone", "createdAt");
