CREATE TABLE "Interview" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "unlockId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "workerId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'REQUESTED',
  "proposedSlots" JSONB NOT NULL,
  "scheduledAt" TIMESTAMP(3),
  "durationMinutes" INTEGER NOT NULL DEFAULT 15,
  "duties" TEXT NOT NULL,
  "schedule" TEXT NOT NULL,
  "meetingArea" TEXT NOT NULL,
  "expectedPayInr" INTEGER,
  "outcome" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "inviteHash" TEXT,
  "inviteExpiresAt" TIMESTAMP(3),
  "roomName" TEXT,
  "roomUrl" TEXT,
  "roomGeneration" INTEGER NOT NULL DEFAULT 0,
  "familyJoinedAt" TIMESTAMP(3),
  "workerJoinedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Interview_status_check" CHECK ("status" IN ('REQUESTED','SCHEDULED','CONFIRMED','COMPLETED','CANCELLED','NO_SHOW')),
  CONSTRAINT "Interview_completed_check" CHECK (("status" = 'COMPLETED') = ("completedAt" IS NOT NULL)),
  CONSTRAINT "Interview_schedule_check" CHECK ("status" NOT IN ('SCHEDULED','CONFIRMED','COMPLETED') OR "scheduledAt" IS NOT NULL),
  CONSTRAINT "Interview_duration_check" CHECK ("durationMinutes" = 15),
  CONSTRAINT "Interview_version_check" CHECK ("version" > 0)
);
CREATE UNIQUE INDEX "Interview_unlockId_key" ON "Interview"("unlockId");
CREATE UNIQUE INDEX "Interview_inviteHash_key" ON "Interview"("inviteHash");
CREATE INDEX "Interview_userId_createdAt_idx" ON "Interview"("userId","createdAt");
CREATE INDEX "Interview_workerId_status_scheduledAt_idx" ON "Interview"("workerId","status","scheduledAt");
CREATE INDEX "Interview_userId_status_scheduledAt_idx" ON "Interview"("userId","status","scheduledAt");
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_unlockId_fkey" FOREIGN KEY ("unlockId") REFERENCES "Unlock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "InterviewBrowserTicket" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "interviewId" TEXT NOT NULL,
  "sessionVersion" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumed" BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX "InterviewBrowserTicket_expiresAt_idx" ON "InterviewBrowserTicket"("expiresAt");
ALTER TABLE "InterviewBrowserTicket" ADD CONSTRAINT "InterviewBrowserTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InterviewBrowserTicket" ADD CONSTRAINT "InterviewBrowserTicket_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
