"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PackToggle({ packId, active }: { packId: string; active: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/packs/${packId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={toggle}
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        active ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-500"
      }`}
    >
      {loading ? "…" : active ? "ON" : "OFF"}
    </button>
  );
}
