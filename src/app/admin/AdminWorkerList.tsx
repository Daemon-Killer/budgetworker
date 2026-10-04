"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Row = {
  id: string;
  name: string;
  phone: string;
  category: string;
  categoryLabel: string;
  employmentType: string;
  employmentLabel: string;
  city: string;
  area: string | null;
  status: string;
  policeVerified: boolean;
  aadhaarVerified: boolean;
  internalNotes: string | null;
  lastCalledAt: string | null;
  resumeFileName: string | null;
  resumeSize: number | null;
};

export function AdminWorkerList({ workers }: { workers: Row[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/workers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function uploadResume(id: string, file: File | null) {
    if (!file) return;
    setBusy(id);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/admin/workers/${id}/resume`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Upload failed");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (workers.length === 0) {
    return <p className="mt-2 text-sm text-slate-600">No workers yet.</p>;
  }

  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Phone (internal)</th>
            <th className="px-3 py-2">Resume</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Call notes</th>
            <th className="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {workers.map((w) => (
            <tr key={w.id} className="border-b border-slate-100 align-top">
              <td className="px-3 py-2">
                <div className="font-medium">{w.name}</div>
                <div className="text-xs text-slate-500">
                  {w.categoryLabel} · {[w.area, w.city].filter(Boolean).join(", ")} ·{" "}
                  {w.employmentLabel}
                </div>
              </td>
              <td className="px-3 py-2 font-mono text-xs">
                <a href={`tel:${w.phone}`} className="text-blue-700 hover:underline">
                  {w.phone}
                </a>
                <p className="mt-0.5 text-[10px] text-slate-400">Not shown publicly</p>
              </td>
              <td className="px-3 py-2 min-w-[10rem]">
                {w.resumeFileName ? (
                  <p className="text-xs text-emerald-700">
                    {w.resumeFileName}
                    {w.resumeSize != null ? ` (${Math.round(w.resumeSize / 1024)} KB)` : ""}
                  </p>
                ) : (
                  <p className="text-xs text-amber-700">No resume — clients cannot unlock</p>
                )}
                <label className="mt-1 inline-block cursor-pointer rounded border border-slate-200 px-2 py-1 text-[10px] font-medium hover:bg-slate-50">
                  {busy === w.id ? "…" : "Upload PDF/DOC"}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,image/jpeg,image/png"
                    className="hidden"
                    disabled={busy === w.id}
                    onChange={(e) => uploadResume(w.id, e.target.files?.[0] ?? null)}
                  />
                </label>
              </td>
              <td className="px-3 py-2">
                <span
                  className={
                    w.status === "AVAILABLE"
                      ? "text-emerald-700"
                      : w.status === "PLACED"
                        ? "text-amber-700"
                        : "text-slate-500"
                  }
                >
                  {w.status}
                </span>
              </td>
              <td className="px-3 py-2 min-w-[12rem]">
                <textarea
                  className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
                  rows={2}
                  placeholder="Internal only…"
                  defaultValue={w.internalNotes ?? ""}
                  onChange={(e) =>
                    setNotesDraft((d) => ({ ...d, [w.id]: e.target.value }))
                  }
                />
                {w.lastCalledAt && (
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    Last call: {new Date(w.lastCalledAt).toLocaleString("en-IN")}
                  </p>
                )}
                <div className="mt-1 flex gap-1">
                  <button
                    type="button"
                    disabled={busy === w.id}
                    className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium"
                    onClick={() =>
                      patch(w.id, {
                        internalNotes: notesDraft[w.id] ?? w.internalNotes ?? "",
                      })
                    }
                  >
                    Save note
                  </button>
                  <button
                    type="button"
                    disabled={busy === w.id}
                    className="rounded bg-pink-50 px-1.5 py-0.5 text-[10px] font-medium text-pink-800"
                    onClick={() =>
                      patch(w.id, {
                        lastCalledAt: new Date().toISOString(),
                      })
                    }
                  >
                    Log call
                  </button>
                </div>
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-1">
                  {(["AVAILABLE", "PLACED", "INACTIVE"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={busy === w.id || w.status === s}
                      onClick={() => patch(w.id, { status: s })}
                      className="rounded border border-slate-200 px-1.5 py-0.5 text-xs disabled:opacity-40"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
