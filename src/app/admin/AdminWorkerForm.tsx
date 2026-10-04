"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { WORKER_CATEGORIES, EMPLOYMENT_TYPES, categoryLabel, employmentLabel } from "@/lib/constants";

export function AdminWorkerForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(null);
    setLoading(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const body = {
      name: fd.get("name"),
      phone: fd.get("phone"),
      category: fd.get("category"),
      employmentType: fd.get("employmentType"),
      city: fd.get("city"),
      area: fd.get("area"),
      age: fd.get("age"),
      skill: fd.get("skill"),
      salaryExpectation: fd.get("salaryExpectation"),
      about: fd.get("about"),
      policeVerified: fd.get("policeVerified") === "on",
      aadhaarVerified: fd.get("aadhaarVerified") === "on",
      status: "AVAILABLE",
    };
    try {
      const res = await fetch("/api/admin/workers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setOk(`Added ${data.worker.name}`);
      form.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
      <input name="name" required placeholder="Name" className="rounded-lg border px-3 py-2 text-sm" />
      <input name="phone" required placeholder="Phone" className="rounded-lg border px-3 py-2 text-sm" />
      <select name="category" className="rounded-lg border px-3 py-2 text-sm" defaultValue="COOK">
        {WORKER_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {categoryLabel(c)}
          </option>
        ))}
      </select>
      <select name="employmentType" className="rounded-lg border px-3 py-2 text-sm" defaultValue="FULL_TIME">
        {EMPLOYMENT_TYPES.map((t) => (
          <option key={t} value={t}>
            {employmentLabel(t)}
          </option>
        ))}
      </select>
      <input name="city" placeholder="City" defaultValue="Pune" className="rounded-lg border px-3 py-2 text-sm" />
      <input name="area" placeholder="Area" className="rounded-lg border px-3 py-2 text-sm" />
      <input name="age" type="number" placeholder="Age" className="rounded-lg border px-3 py-2 text-sm" />
      <input name="salaryExpectation" placeholder="Salary expectation" className="rounded-lg border px-3 py-2 text-sm" />
      <input name="skill" placeholder="Skill" className="rounded-lg border px-3 py-2 text-sm sm:col-span-2" />
      <textarea name="about" placeholder="About" rows={2} className="rounded-lg border px-3 py-2 text-sm sm:col-span-2" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="policeVerified" /> Police verified
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="aadhaarVerified" /> Aadhaar verified
      </label>
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Saving…" : "Add worker"}
        </button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {ok && <p className="mt-2 text-sm text-emerald-700">{ok}</p>}
      </div>
    </form>
  );
}
