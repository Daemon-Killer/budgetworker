import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasUnlocked } from "@/lib/credits";
import { NextResponse } from "next/server";

/**
 * Download resume — only if client has unlocked this worker (1 credit).
 * Directory listing stays free without this.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }

    const unlocked = await hasUnlocked(session.id, id);
    if (!unlocked) {
      return NextResponse.json(
        { error: "Unlock this resume with 1 credit first" },
        { status: 403 },
      );
    }

    const worker = await prisma.worker.findUnique({
      where: { id },
      select: {
        resumeData: true,
        resumeFileName: true,
        resumeMimeType: true,
        status: true,
      },
    });

    if (!worker?.resumeData || !worker.resumeFileName) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const bytes = new Uint8Array(worker.resumeData);
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": worker.resumeMimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${worker.resumeFileName.replace(/"/g, "")}"`,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
