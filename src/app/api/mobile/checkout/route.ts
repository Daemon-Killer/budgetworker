import { randomBytes, createHash } from "node:crypto";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";
import { withCors } from "@/lib/cors";
export async function POST(req: Request) {
  return withCors(req, async () => {
    try {
      const user = await requireUser(req);
      const ticket = randomBytes(32).toString("base64url");
      await prisma.checkoutTicket.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      await prisma.checkoutTicket.create({
        data: {
          id: createHash("sha256").update(ticket).digest("hex"),
          userId: user.id,
          expiresAt: new Date(Date.now() + 120000),
        },
      });
      const origin =
        process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
      return jsonOk({
        url: origin + "/mobile-checkout?t=" + encodeURIComponent(ticket),
      });
    } catch (e) {
      return jsonError(e);
    }
  });
}
export async function OPTIONS(req: Request) {
  return withCors(req, async () => new Response(null, { status: 204 }));
}
