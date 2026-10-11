import { interviewApi, interviewJson } from "@/lib/interview-http";
import { getInterviewInvite, respondInterviewInvite } from "@/lib/interviews";
export const runtime = "nodejs";
export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  return interviewApi(req, async () => getInterviewInvite((await ctx.params).token));
}
export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  return interviewApi(req, async () => respondInterviewInvite((await ctx.params).token, await interviewJson(req)));
}
export async function OPTIONS(req: Request) { return interviewApi(req, async () => ({})); }
