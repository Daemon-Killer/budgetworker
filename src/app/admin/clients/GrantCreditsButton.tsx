"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function GrantCreditsButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function grant() {
    const raw = window.prompt("Credits to grant (e.g. 1 for dead number):", "1");
    if (raw == null) return;
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount === 0) {
      alert("Enter a non-zero number");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/clients/${userId}/credits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, reason: "ADMIN_GRANT" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={grant}
      className="rounded border border-slate-200 px-2 py-1 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
    >
      {loading ? "…" : "+ credits"}
    </button>
  );
}
