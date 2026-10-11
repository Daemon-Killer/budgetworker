import { requireUser, AuthError } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonOk, jsonError } from "@/lib/api";

const kinds = ["AADHAAR", "PHOTO", "POLICE", "EXPERIENCE"];
const limit = 2 * 1024 * 1024;
export async function PUT(req: Request) {
  try {
    if (req.headers.get("sec-fetch-site") === "cross-site")
      throw new AuthError("Cross-site request rejected", 403);
    const user = await requireUser(req);
    const worker = await prisma.worker.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!worker || user.role === "ADMIN")
      throw new AuthError("Create your worker profile first", 403);
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
      if (kind === "AADHAAR" || kind === "POLICE")
        await tx.worker.update({
          where: { id: worker.id },
          data:
            kind === "AADHAAR"
              ? { aadhaarVerified: false }
              : { policeVerified: false },
        });
      return saved;
    });
    return jsonOk({ document });
  } catch (e) {
    return jsonError(e);
  }
}
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const id = new URL(req.url).searchParams.get("id") || "";
    const document = await prisma.workerDocument.findFirst({
      where: {
        id,
        ...(user.role === "ADMIN" ? {} : { worker: { userId: user.id } }),
      },
    });
    if (!document) throw new AuthError("Document not found", 404);
    return new Response(new Uint8Array(document.data), {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": `${document.kind === "PHOTO" && new URL(req.url).searchParams.get("preview") === "1" ? "inline" : "attachment"}; filename="${document.fileName}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox",
      },
    });
  } catch (e) {
    return jsonError(e);
  }
}
