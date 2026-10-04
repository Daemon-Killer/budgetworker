import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCreditBalance } from "@/lib/credits";
import { toPublicWorker } from "@/lib/workers";
import { jsonError, jsonOk } from "@/lib/api";

export async function GET(req:Request) {
  try {
    const user = await requireUser(req);
    const unlocks = await prisma.unlock.findMany({
      where: { userId: user.id },
      include: { worker: true },
      orderBy: { createdAt: "desc" },
    });
    const balance = await getCreditBalance(user.id);

    return jsonOk({
      balance,
      unlocks: unlocks.map((u) => ({
        id: u.id,
        unlockedAt: u.createdAt,
        resumeUrl: `/api/workers/${u.worker.id}/resume`,
        worker: toPublicWorker(u.worker, true),
      })),
    });
  } catch (e) {
    return jsonError(e);
  }
}
