import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";
import { generateWorkerResume } from "@/lib/generate-worker-resume";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await ctx.params;
    const worker = await prisma.worker.findUnique({ where: { id } });
    if (!worker) return new Response("Worker not found", { status: 404 });
    const photo = await prisma.workerDocument.findUnique({ where: { workerId_kind: { workerId: id, kind: "PHOTO" } }, select: { data: true, mimeType: true } });
    const data = await generateWorkerResume(worker, photo);
    await prisma.worker.update({ where: { id }, data: { resumeData: data, resumeMimeType: "application/pdf", resumeFileName: "budget-worker-resume.pdf", resumeSize: data.length, resumeContactReviewed: true } });
    return jsonOk({ ok: true });
  } catch (e) { return jsonError(e); }
}
