"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PackCreateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/admin/packs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          priceInr: Number(fd.get("priceInr")),
          credits: Number(fd.get("credits")),
          sortOrder: Number(fd.get("sortOrder") || 0),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      e.currentTarget.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 grid gap-3 sm:grid-cols-4">
      <input
        name="name"
        required
        placeholder="Name"
        className="rounded-lg border px-3 py-2 text-sm"
      />
      <input
        name="priceInr"
        type="number"
        required
        min={1}
        placeholder="Price ₹"
        className="rounded-lg border px-3 py-2 text-sm"
      />
      <input
        name="credits"
        type="number"
        required
        min={1}
        placeholder="Credits"
        className="rounded-lg border px-3 py-2 text-sm"
      />
      <input
        name="sortOrder"
        type="number"
        placeholder="Sort"
        defaultValue={0}
        className="rounded-lg border px-3 py-2 text-sm"
      />
      <div className="sm:col-span-4">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create pack"}
        </button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    </form>
  );
}
