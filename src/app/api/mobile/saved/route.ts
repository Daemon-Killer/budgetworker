import { withCors } from "@/lib/cors";
import { GET as list } from "@/app/api/me/unlocks/route";
export async function GET(req: Request) {
  return withCors(req, () => list(req));
}
export async function OPTIONS(req: Request) {
  return withCors(req, async () => new Response(null, { status: 204 }));
}
