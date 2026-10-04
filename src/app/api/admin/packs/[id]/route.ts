import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (body.name != null) data.name = String(body.name).trim();
    if (body.priceInr != null) data.priceInr = Math.trunc(Number(body.priceInr));
    if (body.credits != null) data.credits = Math.trunc(Number(body.credits));
    if (body.sortOrder != null) data.sortOrder = Math.trunc(Number(body.sortOrder));
    if (body.active != null) data.active = Boolean(body.active);

    const pack = await prisma.pack.update({ where: { id }, data });
    return jsonOk({ pack });
  } catch (e) {
    return jsonError(e);
  }
}
