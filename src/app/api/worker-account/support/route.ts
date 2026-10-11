import { requireUser, AuthError } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonOk, jsonError } from "@/lib/api";
import { z } from "zod";
const input = z
  .object({
    topic: z.enum(["CLIENT", "SALARY", "EXTRA_WORK", "LEAVE", "QUIT", "OTHER"]),
    message: z.string().trim().min(5).max(2000),
  })
  .strict();
export async function POST(req: Request) {
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
    const parsed = input.safeParse(await req.json());
    if (!parsed.success)
      throw new AuthError("Choose a topic and enter 5–2000 characters", 400);
    const count = await prisma.workerSupportRequest.count({
      where: {
        workerId: worker.id,
        createdAt: { gte: new Date(Date.now() - 86400000) },
      },
    });
    if (count >= 10)
      throw new AuthError("Please wait before sending more requests", 429);
    const request = await prisma.workerSupportRequest.create({
      data: { workerId: worker.id, ...parsed.data },
      select: { id: true },
    });
    return jsonOk({ request }, { status: 201 });
  } catch (e) {
    return jsonError(e);
  }
}
