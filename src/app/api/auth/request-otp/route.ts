import { requestOtp, AuthError } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phone = String(body.phone ?? "");
    const result = await requestOtp(phone);
    return jsonOk(result);
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e);
    return jsonError(e);
  }
}
