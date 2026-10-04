import { requireUser } from "@/lib/auth";
import { unlockWorker } from "@/lib/credits";
import { jsonError, jsonOk } from "@/lib/api";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(req);
    const { id } = await ctx.params;
    const result = await unlockWorker(user.id, id);
    return jsonOk(result);
  } catch (e) {
    return jsonError(e);
  }
}
