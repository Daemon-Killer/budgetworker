import Link from "next/link";
import type { PublicWorker } from "@/lib/workers";
import { categoryLabel, employmentLabel } from "@/lib/constants";

export function WorkerCard({ worker }: { worker: PublicWorker }) {
  return (
    <Link
      href={`/workers/${worker.id}`}
      className="hh-card group block rounded-2xl p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-pink-100 text-sm font-bold text-blue-900">
              {worker.name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-slate-900 group-hover:text-blue-800">
                {worker.name}
              </h3>
              <p className="text-sm text-slate-500">
                {categoryLabel(worker.category)} · {employmentLabel(worker.employmentType)}
              </p>
            </div>
          </div>
        </div>
        <div className="shrink-0">
          {worker.unlocked ? (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-100">
              Unlocked
            </span>
          ) : worker.hasResume ? (
            <span className="rounded-full bg-pink-50 px-2.5 py-1 text-[11px] font-semibold text-pink-800 ring-1 ring-pink-100">
              Resume
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
              Profile
            </span>
          )}
        </div>
      </div>

      <p className="mt-3 text-sm text-slate-600">
        <span className="font-medium text-slate-800">
          {[worker.area, worker.city].filter(Boolean).join(", ") || worker.city}
        </span>
        {worker.experienceYears != null ? (
          <span className="text-slate-500"> · {worker.experienceYears}y exp</span>
        ) : null}
      </p>

      {worker.skill && (
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-500">
          {worker.skill}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
        {worker.policeVerified && (
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-800">
            Police ✓
          </span>
        )}
        {worker.aadhaarVerified && (
          <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-800">
            Aadhaar ✓
          </span>
        )}
        {worker.salaryExpectation && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900">
            {worker.salaryExpectation}
          </span>
        )}
        <span className="ml-auto text-[12px] font-semibold text-blue-700 opacity-0 transition group-hover:opacity-100">
          View →
        </span>
      </div>
    </Link>
  );
}
