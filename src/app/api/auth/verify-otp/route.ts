import { verifyOtp } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const user = await verifyOtp(
      String(body.phone ?? ""),
      String(body.code ?? ""),
      body.name ? String(body.name) : undefined,
    );
    return jsonOk({ user });
  } catch (e) {
    return jsonError(e);
  }
}
