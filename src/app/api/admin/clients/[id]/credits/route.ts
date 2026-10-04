import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id: userId } = await ctx.params;
    const body = await req.json();
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount === 0) {
      return jsonError(Object.assign(new Error("amount must be non-zero number"), { status: 400 }));
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return jsonError(Object.assign(new Error("User not found"), { status: 404 }));
    }

    const reason = String(body.reason || "ADMIN_GRANT").slice(0, 80);
    const entry = await prisma.creditLedger.create({
      data: {
        userId,
        delta: Math.trunc(amount),
        reason,
      },
    });

    return jsonOk({ entry });
  } catch (e) {
    return jsonError(e);
  }
}
