CREATE TABLE "WorkerDocument" (
 "id" TEXT NOT NULL, "workerId" TEXT NOT NULL, "kind" TEXT NOT NULL,
 "fileName" TEXT NOT NULL, "mimeType" TEXT NOT NULL, "data" BYTEA NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'PENDING', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "WorkerDocument_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "WorkerDocument_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "WorkerDocument_workerId_kind_key" ON "WorkerDocument"("workerId", "kind");
CREATE TABLE "WorkerSupportRequest" (
 "id" TEXT NOT NULL, "workerId" TEXT NOT NULL, "topic" TEXT NOT NULL, "message" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'OPEN', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "WorkerSupportRequest_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "WorkerSupportRequest_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "WorkerSupportRequest_workerId_createdAt_idx" ON "WorkerSupportRequest"("workerId", "createdAt");
