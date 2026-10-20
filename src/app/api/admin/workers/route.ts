import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";
import { validateWorker } from "@/lib/worker-input";
import { adminWorkerSelect } from "@/lib/admin-worker-select";
export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const params = new URL(req.url).searchParams;
    const page = Math.max(1, Math.min(100000, Number(params.get("page")) || 1));
    const q = (params.get("q") || "").trim().slice(0, 100);
    const where = q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { phone: { contains: q } }, { city: { contains: q, mode: "insensitive" as const } }] } : {};
    const workers = await prisma.worker.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 100,
      skip: (Math.floor(page) - 1) * 100,
      select: adminWorkerSelect,
    });
    return jsonOk({ workers, total: await prisma.worker.count({ where }), page: Math.floor(page) });
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
