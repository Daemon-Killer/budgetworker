import crypto from "crypto";
import Razorpay from "razorpay";

export function getPaymentMode(): "mock" | "razorpay" {
  const forced = process.env.PAYMENT_MODE?.toLowerCase();
  if (forced === "mock") return "mock";
  if (forced === "razorpay") {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error(
        "PAYMENT_MODE=razorpay but RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing",
      );
    }
    return "razorpay";
  }
  // Auto: use Razorpay when keys exist
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    return "razorpay";
  }
  return "mock";
}

export function getRazorpayKeyId(): string {
  const id = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
  if (!id) throw new Error("Razorpay key id not configured");
  return id;
}

export function getRazorpayClient() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new Error("Razorpay keys not configured");
  }
  return new Razorpay({ key_id, key_secret });
}

/** Amount in INR → paise for Razorpay */
export function inrToPaise(inr: number): number {
  return Math.round(inr * 100);
}

export function verifyPaymentSignature(input: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const body = `${input.razorpayOrderId}|${input.razorpayPaymentId}`;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "utf8"),
      Buffer.from(input.razorpaySignature, "utf8"),
    );
  } catch {
    return false;
  }
}
