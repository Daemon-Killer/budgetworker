import { requireAdmin } from "@/lib/auth";
import { interviewApi, interviewAppOrigin, interviewJson } from "@/lib/interview-http";
import { mutateAdminInterview } from "@/lib/interviews";
export const runtime = "nodejs";
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return interviewApi(req, async () => mutateAdminInterview((await requireAdmin(req)).id, (await ctx.params).id, await interviewJson(req), interviewAppOrigin(req)));
}
export async function OPTIONS(req: Request) { return interviewApi(req, async () => ({})); }
