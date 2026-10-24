import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";
import { publicResumeFileName } from "@/lib/resume-file";

const MAX_BYTES = 4 * 1024 * 1024; // 4MB (Vercel body limit friendly)
const ALLOWED = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
]);

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await ctx.params;
    const worker = await prisma.worker.findUnique({ where: { id }, select: { resumeData: true, resumeMimeType: true } });
    if (!worker?.resumeData) return new Response("Resume not found", { status: 404 });
    return new Response(new Uint8Array(worker.resumeData), { headers: {
      "Content-Type": worker.resumeMimeType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${publicResumeFileName(worker.resumeMimeType, null)}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch (e) { return jsonError(e); }
}

/**
 * Internal: upload resume file for a worker (multipart form field "file").
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(req);
    const { id } = await ctx.params;

    const form = await req.formData();
    if (form.get("contactReviewed") !== "true") {
      return jsonError(Object.assign(new Error("Review the resume and remove contact details before uploading"), { status: 400 }));
    }
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return jsonError(
        Object.assign(new Error("file required"), { status: 400 }),
      );
    }
    if (file.size > MAX_BYTES) {
      return jsonError(
        Object.assign(new Error("File too large (max 4MB)"), { status: 400 }),
      );
    }
    const mime = file.type || "application/octet-stream";
    if (
      !ALLOWED.has(mime) &&
      !file.name.match(/\.(pdf|doc|docx|jpg|jpeg|png)$/i)
    ) {
      return jsonError(
        Object.assign(new Error("Upload PDF, DOC, DOCX, JPG or PNG"), {
          status: 400,
        }),
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const worker = await prisma.worker.update({
      where: { id },
      data: {
        resumeFileName: file.name.slice(0, 200),
        resumeMimeType: mime,
        resumeSize: buf.length,
        resumeData: buf,
        resumeContactReviewed: true,
      },
      select: {
        id: true,
        name: true,
        resumeFileName: true,
        resumeMimeType: true,
        resumeSize: true,
        resumeContactReviewed: true,
      },
    });

    return jsonOk({ worker });
  } catch (e) {
    return jsonError(e);
  }
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(req);
    const { id } = await ctx.params;
    await prisma.worker.update({
      where: { id },
      data: {
        resumeFileName: null,
        resumeMimeType: null,
        resumeSize: null,
        resumeData: null,
        resumeContactReviewed: false,
      },
    });
    return jsonOk({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
