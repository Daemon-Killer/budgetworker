"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { categoryLabel, employmentLabel } from "@/lib/constants";

export function WorkersFilter({
  categories,
  employmentTypes,
  initial,
}: {
  categories: string[];
  employmentTypes: string[];
  initial: {
    city: string;
    category: string;
    employmentType: string;
    q: string;
  };
}) {
  const router = useRouter();
  const [city, setCity] = useState(initial.city);
  const [category, setCategory] = useState(initial.category);
  const [employmentType, setEmploymentType] = useState(initial.employmentType);
  const [q, setQ] = useState(initial.q);

  function apply(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (city) params.set("city", city);
    if (category) params.set("category", category);
    if (employmentType) params.set("employmentType", employmentType);
    if (q) params.set("q", q);
    router.push(`/workers?${params.toString()}`);
  }

  return (
    <form
      onSubmit={apply}
      className="grid gap-2.5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-2 lg:grid-cols-5 lg:p-4"
    >
      <input
        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
        placeholder="Search skills, area…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <input
        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
        placeholder="City"
        value={city}
        onChange={(e) => setCity(e.target.value)}
      />
      <select
        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-300 focus:bg-white"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {categoryLabel(c)}
          </option>
        ))}
      </select>
      <select
        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-300 focus:bg-white"
        value={employmentType}
        onChange={(e) => setEmploymentType(e.target.value)}
      >
        <option value="">Part / full time</option>
        {employmentTypes.map((t) => (
          <option key={t} value={t}>
            {employmentLabel(t)}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
      >
        Apply filters
      </button>
    </form>
  );
}
