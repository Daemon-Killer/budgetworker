"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/app";
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [otpMode, setOtpMode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setDevCode(data.devCode ?? null);
      setOtpMode(data.mode ?? null);
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code, name: name || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      const dest =
        nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/workers";
      router.push(dest);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold">Log in with phone</h1>
      <p className="mt-1 text-sm text-slate-600">
        Verify your mobile number to access your account.
      </p>

      {step === "phone" ? (
        <form onSubmit={sendOtp} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            Mobile number
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="10-digit mobile"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm font-medium">
            Name (optional)
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Sending…" : "Send OTP"}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-6 space-y-4">
          <p className="text-sm text-slate-600">
            {otpMode === "dev" ? "Test login ready for " : "Code sent to "}<strong>{phone}</strong>
            {otpMode === "msg91" && (
              <span className="mt-1 block text-xs text-slate-500">
                Check your SMS. Code expires in about 10 minutes.
              </span>
            )}
            {devCode && (
              <span className="mt-1 block rounded bg-amber-50 px-2 py-1 text-amber-900">
                Dev mode (no SMS) — OTP: <strong>{devCode}</strong>
              </span>
            )}
            {otpMode === "dev" && !devCode && (
              <span className="mt-1 block rounded bg-amber-50 px-2 py-1 text-amber-900">
                Testing mode — no SMS will arrive. Enter the private test code shared by the site owner.
              </span>
            )}
          </p>
          <label className="block text-sm font-medium">
            OTP
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 tracking-widest"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              inputMode="numeric"
              autoComplete="one-time-code"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Verifying…" : "Verify & continue"}
          </button>
          <button
            type="button"
            className="w-full text-sm text-slate-500"
            onClick={() => {
              setStep("phone");
              setCode("");
              setDevCode(null);
              setOtpMode(null);
            }}
          >
            Change number
          </button>
        </form>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md text-sm text-slate-500">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
