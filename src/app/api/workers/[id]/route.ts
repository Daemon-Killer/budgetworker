import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasUnlocked } from "@/lib/credits";
import { toPublicWorker } from "@/lib/workers";
import { jsonError, jsonOk } from "@/lib/api";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const worker = await prisma.worker.findUnique({ where: { id } });
    if (!worker || worker.status !== "AVAILABLE" || worker.onboardingStatus !== "APPROVED") {
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
