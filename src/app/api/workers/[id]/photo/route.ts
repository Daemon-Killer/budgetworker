import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const document = await prisma.workerDocument.findFirst({
      where: { workerId: id, kind: "PHOTO", worker: { status: "AVAILABLE", onboardingStatus: "APPROVED" } },
      select: { data: true, mimeType: true },
    });
    if (!document || !["image/jpeg", "image/png"].includes(document.mimeType))
      return new Response("Photo not found", { status: 404 });
    return new Response(new Uint8Array(document.data), { headers: {
      "Content-Type": document.mimeType,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch (e) { return jsonError(e); }
}
