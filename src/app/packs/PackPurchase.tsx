"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  loadRazorpayScript,
  type RazorpaySuccessResponse,
} from "@/lib/load-razorpay";

export function PackPurchase({
  packId,
  loggedIn,
}: {
  packId: string;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!loggedIn) {
    return (
      <Link
        href="/login?next=/packs"
        className="block rounded-full bg-gradient-to-r from-blue-600 to-pink-600 py-2.5 text-center text-sm font-semibold text-white"
      >
        Log in to buy
      </Link>
    );
  }

  async function buy() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/orders/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Purchase failed");

      // Mock path: already paid
      if (data.status === "PAID") {
        setMessage(`+${data.credits} credits (balance ${data.balance})`);
        router.refresh();
        return;
      }

      // Razorpay Checkout (test or live)
      if (data.mode === "razorpay" && data.razorpayOrderId) {
        setTestMode(String(data.keyId).startsWith("rzp_test_"));
        const ok = await loadRazorpayScript();
        if (!ok || !window.Razorpay) {
          throw new Error("Could not load Razorpay Checkout");
        }

        await new Promise<void>((resolve, reject) => {
          const rzp = new window.Razorpay!({
            key: data.keyId,
            amount: data.amountPaise,
            currency: "INR",
            name: "Budget Worker",
            description: `${data.packName} · ${data.credits} resume unlocks`,
            order_id: data.razorpayOrderId,
            prefill: {
              contact: data.prefill?.contact || "",
              name: data.prefill?.name || "",
            },
            theme: { color: "#2563eb" },
            handler: async (response: RazorpaySuccessResponse) => {
              try {
                const vRes = await fetch("/api/orders/verify", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    orderId: data.orderId,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                  }),
                });
                const vData = await vRes.json();
                if (!vRes.ok)
                  throw new Error(vData.error || "Verification failed");
                setMessage(
                  `+${vData.credits} credits (balance ${vData.balance})`,
                );
                router.refresh();
                resolve();
              } catch (e) {
                reject(e);
              }
            },
            modal: {
              ondismiss: () => {
                reject(new Error("Payment cancelled"));
              },
            },
          });
          rzp.open();
        });
        return;
      }

      setMessage(data.message || "Order created");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      if (msg !== "Payment cancelled") setError(msg);
      else setError("Payment cancelled");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={loading}
        onClick={buy}
        className="w-full rounded-full bg-gradient-to-r from-blue-600 to-pink-600 py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
      >
        {loading ? "Opening payment…" : "Pay with Razorpay"}
      </button>
      {testMode && (
        <p className="text-center text-[10px] leading-relaxed text-slate-400">
          Test mode (no real money). Prefer <strong>UPI</strong>:{" "}
          <code className="text-slate-600">success@razorpay</code>
          <br />
          Or Indian card:{" "}
          <code className="text-slate-600">5267 3181 8797 5449</code> (any
          future expiry / CVV). Avoid 4111… — treated as international.
        </p>
      )}
      {message && <p className="text-xs text-emerald-700">{message}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
