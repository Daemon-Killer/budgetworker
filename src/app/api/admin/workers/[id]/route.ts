import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";
import { validateWorker } from "@/lib/worker-input";
import { adminWorkerSelect } from "../route";
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(req);
    const { id } = await ctx.params;
    const data = validateWorker(await req.json(), true);
    const worker = await prisma.worker.update({
      where: { id },
      data: {
        ...data,
        ...(data.status === "AVAILABLE"
          ? { onboardingStatus: "APPROVED" }
          : {}),
      },
      select: adminWorkerSelect,
    });
    return jsonOk({ worker });
  } catch (e) {
    return jsonError(e);
  }
}
