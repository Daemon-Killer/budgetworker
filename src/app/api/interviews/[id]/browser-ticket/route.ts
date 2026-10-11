import { interviewApi, interviewAppOrigin, requireFamily } from "@/lib/interview-http";
import { createInterviewBrowserTicket } from "@/lib/interviews";
export const runtime = "nodejs";
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return interviewApi(req, async () => createInterviewBrowserTicket(await requireFamily(req), (await ctx.params).id, interviewAppOrigin(req)));
}
export async function OPTIONS(req: Request) { return interviewApi(req, async () => ({})); }
