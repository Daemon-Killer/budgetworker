import { withCors } from "@/lib/cors";
import { jsonOk } from "@/lib/api";
import { GET as detail } from "@/app/api/workers/[id]/route";
import { GET as resume } from "@/app/api/workers/[id]/resume/route";
import { POST as unlock } from "@/app/api/workers/[id]/unlock/route";
type Ctx = { params: Promise<{ path?: string[] }> };
export async function GET(req: Request, ctx: Ctx) {
  return withCors(req, async () => {
    const p = (await ctx.params).path ?? [];
    if (p.length === 1)
      return detail(req, { params: Promise.resolve({ id: p[0] }) });
    if (p.length === 2 && p[1] === "resume")
      return resume(req, { params: Promise.resolve({ id: p[0] }) });
    return jsonOk({ error: "Not found" }, { status: 404 });
  });
}
export async function POST(req: Request, ctx: Ctx) {
  return withCors(req, async () => {
    const p = (await ctx.params).path ?? [];
    if (p.length === 2 && p[1] === "unlock")
      return unlock(req, { params: Promise.resolve({ id: p[0] }) });
    return jsonOk({ error: "Not found" }, { status: 404 });
  });
}
export async function OPTIONS(req: Request) {
  return withCors(req, async () => new Response(null, { status: 204 }));
}
