import { withCors } from "@/lib/cors";
import {
  requestOtp,
  verifyOtp,
  createSessionToken,
  requireUser,
} from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";
async function handlePOST(
  req: Request,
  ctx: { params: Promise<{ action: string }> },
) {
  try {
    const { action } = await ctx.params;
    if (action === "logout") {
      const user = await requireUser(req);
      await prisma.user.update({
        where: { id: user.id },
        data: { sessionVersion: { increment: 1 } },
      });
      return jsonOk({ ok: true });
    }
    const body = await req.json();
    if (action === "request")
      return jsonOk(await requestOtp(String(body.phone ?? "")));
    if (action === "verify") {
      const user = await verifyOtp(
        String(body.phone ?? ""),
        String(body.code ?? ""),
        body.name ? String(body.name) : undefined,
        true,
      );
      return jsonOk({ user, token: await createSessionToken(user) });
    }
    return jsonOk({ error: "Not found" }, { status: 404 });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ action: string }> },
) {
  return withCors(req, () => handlePOST(req, ctx));
}
export async function OPTIONS(req: Request) {
  return withCors(req, async () => new Response(null, { status: 204 }));
}
