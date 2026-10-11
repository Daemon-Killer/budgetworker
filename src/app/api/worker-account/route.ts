import { requireUser, AuthError } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api";
import { ownWorkerAccount, saveOwnWorker } from "@/lib/worker-account";

export async function GET(req: Request) {
  try { return jsonOk(await ownWorkerAccount(await requireUser(req)), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return jsonError(error); }
}

export async function PUT(req: Request) {
  try {
    if (req.headers.get("sec-fetch-site") === "cross-site") throw new AuthError("Cross-site request rejected", 403);
    if (!req.headers.get("content-type")?.includes("application/json")) throw new AuthError("JSON required", 415);
    const user = await requireUser(req);
    let input: unknown;
    try { input = await req.json(); } catch { throw new AuthError("Invalid JSON", 400); }
    return jsonOk({ profile: await saveOwnWorker(user, input) });
  } catch (error) { return jsonError(error); }
}
