import { interviewApi, interviewJson, requireFamily } from "@/lib/interview-http";
import { mutateFamilyInterview } from "@/lib/interviews";
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return interviewApi(req, async () => mutateFamilyInterview((await requireFamily(req)).id, (await ctx.params).id, await interviewJson(req)));
}
export async function OPTIONS(req: Request) { return interviewApi(req, async () => ({})); }
