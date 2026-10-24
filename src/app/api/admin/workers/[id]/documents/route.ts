import { requireAdmin, AuthError } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonOk, jsonError } from "@/lib/api";

const kinds = ["AADHAAR", "PHOTO"];
const limit = 2 * 1024 * 1024;
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    if (req.headers.get("sec-fetch-site") === "cross-site")
      throw new AuthError("Cross-site request rejected", 403);
    await requireAdmin(req);
    const { id } = await ctx.params;
    const worker = await prisma.worker.findUnique({ where: { id }, select: { id: true } });
    if (!worker) throw new AuthError("Worker not found", 404);
    const kind = new URL(req.url).searchParams.get("kind") || "";
    if (!kinds.includes(kind))
      throw new AuthError("Invalid document type", 400);
    if (Number(req.headers.get("content-length")) > limit)
      throw new AuthError("Maximum file size is 2 MB", 413);
    const reader = req.body?.getReader();
    if (!reader) throw new AuthError("Choose a document", 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        throw new AuthError("Maximum file size is 2 MB", 413);
      }
      chunks.push(value);
    }
    const data = Buffer.concat(chunks);
    const mimeType = data
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      ? "image/png"
      : data[0] === 255 && data[1] === 216 && data[2] === 255
        ? "image/jpeg"
        : data.subarray(0, 5).toString() === "%PDF-"
          ? "application/pdf"
          : "";
    if (!mimeType || (kind === "PHOTO" && mimeType === "application/pdf"))
      throw new AuthError(
        "Choose a JPG, PNG, or PDF file (photo: JPG/PNG)",
        400,
      );
    const fileName = `${kind.toLowerCase()}.${mimeType === "image/png" ? "png" : mimeType === "image/jpeg" ? "jpg" : "pdf"}`;
    const document = await prisma.$transaction(async (tx) => {
      const saved = await tx.workerDocument.upsert({
        where: { workerId_kind: { workerId: worker.id, kind } },
        create: { workerId: worker.id, kind, data, mimeType, fileName },
        update: { data, mimeType, fileName, status: "PENDING" },
        select: { id: true, kind: true, fileName: true, status: true },
      });
      if (kind === "AADHAAR")
        await tx.worker.update({ where: { id: worker.id }, data: { aadhaarVerified: false } });
      if (kind === "PHOTO")
        await tx.worker.update({ where: { id: worker.id }, data: { photoUrl: `/api/workers/${worker.id}/photo` } });
      return saved;
    });
    return jsonOk({ document });
  } catch (e) {
    return jsonError(e);
  }
}
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await ctx.params;
    const kind = new URL(req.url).searchParams.get("kind") || "";
    if (!kinds.includes(kind)) throw new AuthError("Invalid document type", 400);
    const document = await prisma.workerDocument.findUnique({ where: { workerId_kind: { workerId: id, kind } } });
    if (!document) throw new AuthError("Document not found", 404);
    return new Response(new Uint8Array(document.data), { headers: {
      "Content-Type": document.mimeType,
      "Content-Disposition": `attachment; filename="${document.fileName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
    } });
  } catch (e) { return jsonError(e); }
}
