import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasUnlocked } from "@/lib/credits";
import { toPublicWorker } from "@/lib/workers";
import { jsonError, jsonOk } from "@/lib/api";
import { publicWorkerSelect } from "@/lib/directory";
import { CATEGORIES } from "../../../../../shared/marketplace";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const worker = await prisma.worker.findFirst({
      where: { id, status: "AVAILABLE", onboardingStatus: "APPROVED", category: { in: [...CATEGORIES] } },
      select: publicWorkerSelect,
    });
    if (!worker) {
      return jsonError(Object.assign(new Error("Worker not found"), { status: 404 }));
    }

    const session = await getSession(req);
    const unlocked = session ? await hasUnlocked(session.id, worker.id) : false;

    return jsonOk({
      worker: toPublicWorker(worker, unlocked),
    });
  } catch (e) {
    return jsonError(e);
  }
}
