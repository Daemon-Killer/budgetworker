import { PATCH as patch } from "@/app/api/admin/workers/[id]/route";
import { GET as list, POST as create } from "@/app/api/admin/workers/route";
import { POST as upload } from "@/app/api/admin/workers/[id]/resume/route";
import { withCors } from "@/lib/cors";
import { jsonOk } from "@/lib/api";
type Ctx = { params: Promise<{ path?: string[] }> };
export async function GET(req: Request, ctx: Ctx) {
  return withCors(req, async () => {
    const p = (await ctx.params).path ?? [];
    if (p.join("/") === "workers") return list(req);
    return jsonOk({ error: "Not found" }, { status: 404 });
  });
}
export async function POST(req: Request, ctx: Ctx) {
  return withCors(req, async () => {
    const p = (await ctx.params).path ?? [];
    if (p.join("/") === "workers") return create(req);
    if (p[0] === "workers" && p[2] === "resume" && p.length === 3)
      return upload(req, { params: Promise.resolve({ id: p[1] }) });
    return jsonOk({ error: "Not found" }, { status: 404 });
  });
}
export async function OPTIONS(req: Request) {
  return withCors(req, async () => new Response(null, { status: 204 }));
}

export async function PATCH(req: Request, ctx: Ctx) {
  return withCors(req, async () => {
    const p = (await ctx.params).path ?? [];
    if (p[0] === "workers" && p.length === 2)
      return patch(req, { params: Promise.resolve({ id: p[1] }) });
    return jsonOk({ error: "Not found" }, { status: 404 });
  });
}
