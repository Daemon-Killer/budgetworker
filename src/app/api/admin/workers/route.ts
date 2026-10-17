import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";
import { validateWorker } from "@/lib/worker-input";
import { adminWorkerSelect } from "@/lib/admin-worker-select";
export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const workers = await prisma.worker.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: adminWorkerSelect,
    });
    return jsonOk({ workers });
  } catch (e) {
    return jsonError(e);
  }
}
export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    const parsed = validateWorker(await req.json());
    const worker = await prisma.worker.create({
      data: {
        ...parsed,
        name: parsed.name!,
        phone: parsed.phone!,
        category: parsed.category!,
        city: parsed.city!,
        employmentType: parsed.employmentType!,
        onboardingStatus: "APPROVED",
      },
      select: adminWorkerSelect,
    });
    return jsonOk({ worker }, { status: 201 });
  } catch (e) {
    return jsonError(e);
  }
}
