import { interviewApi, requireFamily } from "@/lib/interview-http";
import { joinFamilyInterview } from "@/lib/interviews";
export const runtime = "nodejs";
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return interviewApi(req, async () => joinFamilyInterview(await requireFamily(req), (await ctx.params).id));
}
export async function OPTIONS(req: Request) { return interviewApi(req, async () => ({})); }
