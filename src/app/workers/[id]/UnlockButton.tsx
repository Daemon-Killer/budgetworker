"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function UnlockButton({
  workerId,
  alreadyUnlocked,
  hasResume,
  resumeFileName,
  loggedIn,
  balance,
}: {
  workerId: string;
  alreadyUnlocked: boolean;
  hasResume: boolean;
  resumeFileName: string | null;
  loggedIn: boolean;
  balance: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(alreadyUnlocked);

  if (!hasResume) {
    return (
      <p className="text-sm text-slate-500">
        Resume not uploaded yet. Browse other profiles or check back later.
      </p>
    );
  }

  if (!loggedIn) {
    return (
      <Link
        href={`/login?next=/workers/${workerId}`}
        className="inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
      >
        Log in to unlock resume
      </Link>
    );
  }

  if (ready || alreadyUnlocked) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-emerald-700">
          Resume unlocked
          {resumeFileName ? `: ${resumeFileName}` : ""}. Re-download anytime
          free.
        </p>
        <a
          href={`/api/workers/${workerId}/resume`}
          className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Download resume
        </a>
      </div>
    );
  }

  async function unlock() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/workers/${workerId}/unlock`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402) {
          setError(data.error);
        } else {
          throw new Error(data.error || "Unlock failed");
        }
        return;
      }
      setReady(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        Your balance: {balance} resume credits
      </p>
      <button
        type="button"
        disabled={loading}
        onClick={unlock}
        className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
      >
        {loading ? "Unlocking…" : "Unlock resume (1 credit)"}
      </button>
      {error && (
        <p className="text-sm text-red-600">
          {error}{" "}
          {error.toLowerCase().includes("credit") && (
            <Link href="/packs" className="font-medium underline">
              Buy a pack
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
