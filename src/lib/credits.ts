import { prisma } from "./db";

export async function getCreditBalance(userId: string): Promise<number> {
  const agg = await prisma.creditLedger.aggregate({
    where: { userId },
    _sum: { delta: true },
  });
  return agg._sum.delta ?? 0;
}

export async function hasUnlocked(
  userId: string,
  workerId: string,
): Promise<boolean> {
  const row = await prisma.unlock.findUnique({
    where: { userId_workerId: { userId, workerId } },
  });
  return Boolean(row);
}

export async function listUnlockedWorkerIds(
  userId: string,
): Promise<Set<string>> {
  const rows = await prisma.unlock.findMany({
    where: { userId },
    select: { workerId: true },
  });
  return new Set(rows.map((r) => r.workerId));
}

/**
 * Unlock worker resume: free if already unlocked; else spend 1 credit.
 * Public directory data is free; only the resume file is gated.
 */
export async function unlockWorker(userId: string, workerId: string) {
  return prisma.$transaction(async (tx) => {
    // Serialize debits for one wallet, including requests for different resumes.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR UPDATE`;
    const existing = await tx.unlock.findUnique({
      where: { userId_workerId: { userId, workerId } },
    });
    const worker = await tx.worker.findUnique({
      where: { id: workerId },
      select: {
        id: true,
        status: true,
        onboardingStatus: true,
        resumeSize: true,
        resumeFileName: true,
      },
    });
    if (
      !worker ||
      (existing
        ? false
        : worker.status !== "AVAILABLE" ||
          worker.onboardingStatus !== "APPROVED")
    )
      throw new CreditError("Worker not available", 404);
    if (!worker.resumeSize || !worker.resumeFileName)
      throw new CreditError("No resume uploaded for this worker yet", 404);
    const agg = await tx.creditLedger.aggregate({
      where: { userId },
      _sum: { delta: true },
    });
    const balance = agg._sum.delta ?? 0;
    if (existing)
      return {
        alreadyUnlocked: true,
        workerId,
        resumeFileName: worker.resumeFileName,
        resumeUrl: "/api/workers/" + workerId + "/resume",
        balance,
      };
    if (balance < 1)
      throw new CreditError(
        "Insufficient credits. Buy a plan to unlock a resume.",
        402,
      );
    const unlock = await tx.unlock.create({ data: { userId, workerId } });
    await tx.creditLedger.create({
      data: { userId, delta: -1, reason: "UNLOCK_RESUME", unlockId: unlock.id },
    });
    return {
      alreadyUnlocked: false,
      workerId,
      unlockId: unlock.id,
      resumeFileName: worker.resumeFileName,
      resumeUrl: "/api/workers/" + workerId + "/resume",
      balance: balance - 1,
    };
  });
}

export class CreditError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
