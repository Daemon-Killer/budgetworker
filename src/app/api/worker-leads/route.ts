import { jsonError, jsonOk } from "@/lib/api";
import { submitWorkerLead } from "@/lib/worker-leads";

export async function POST(req: Request) {
  try {
    if (Number(req.headers.get("content-length")) > 16000) return Response.json({ error: "Form is too large" }, { status: 413 });
    const text = await req.text();
    if (text.length > 16000) return Response.json({ error: "Form is too large" }, { status: 413 });
    return jsonOk(await submitWorkerLead(JSON.parse(text)), { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({ error: "Invalid form details" }, { status: 400 });
    return jsonError(error);
  }
}
