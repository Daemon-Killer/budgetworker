import { requireUser } from "@/lib/auth";
import { verifyRazorpayPayment } from "@/lib/payments";
import { getCreditBalance } from "@/lib/credits";
import { jsonError, jsonOk } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const result = await verifyRazorpayPayment({
      orderId: String(body.orderId ?? ""),
      userId: user.id,
      razorpayOrderId: String(body.razorpay_order_id ?? body.razorpayOrderId ?? ""),
      razorpayPaymentId: String(body.razorpay_payment_id ?? body.razorpayPaymentId ?? ""),
      razorpaySignature: String(body.razorpay_signature ?? body.razorpaySignature ?? ""),
    });
    const balance = await getCreditBalance(user.id);
    return jsonOk({ ...result, balance });
  } catch (e) {
    return jsonError(e);
  }
}
