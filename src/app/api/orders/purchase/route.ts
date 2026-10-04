import { requireUser } from "@/lib/auth";
import { purchasePack } from "@/lib/payments";
import { getCreditBalance } from "@/lib/credits";
import { jsonError, jsonOk } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const packId = String(body.packId ?? "");
    const result = await purchasePack(user.id, packId);
    // Only attach balance when already paid (mock); pending Razorpay has no credit yet
    if ("status" in result && result.status === "PAID") {
      const balance = await getCreditBalance(user.id);
      return jsonOk({ ...result, balance });
    }
    return jsonOk(result);
  } catch (e) {
    return jsonError(e);
  }
}
