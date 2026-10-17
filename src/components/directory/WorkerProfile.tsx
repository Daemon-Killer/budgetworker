"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { LABELS } from "../../../shared/marketplace";
import { employmentLabel } from "@/lib/constants";
import { periodLabels, type DirectoryWorker, type ResumePack } from "../../../shared/directory";
import { ResumeAccess } from "./ResumeAccess";
import { useLiveWorkers } from "./useLiveWorkers";

export function WorkerProfile({ initial, packs, loggedIn, balance }: {
  initial: DirectoryWorker;
  packs: ResumePack[];
  loggedIn: boolean;
  balance: number;
}) {
  const [worker, setWorker] = useState<DirectoryWorker | null>(initial);
  const refresh = useCallback(async (signal: AbortSignal) => {
    const response = await fetch("/api/workers/" + initial.id, { cache: "no-store", signal });
    if (response.status === 404) {
      if (!signal.aborted) setWorker(null);
      return;
    }
    if (!response.ok) throw Error("Unable to refresh profile");
    const data = await response.json();
    if (!signal.aborted) setWorker(data.worker);
  }, [initial.id]);
  useLiveWorkers(refresh);
  if (!worker) return (
    <div className="bw-workspace">
      <Link href="/workers" className="bw-text-button">← All workers</Link>
      <div className="bw-card" role="status">
        <h1>This worker is currently unavailable</h1>
        <p>Browse other available workers in the directory.</p>
      </div>
    </div>
  );
  const w = worker;
  const rows = [
    ["Type of help", [w.category, w.secondaryCategory].filter(Boolean).map((category) => LABELS[category!]).join(", ")],
    [
      "Work arrangement",
      employmentLabel(w.employmentType),
    ],
    ["Location", [w.area, w.city].filter(Boolean).join(", ")],
    [
      "Daily hours",
      w.hoursPerDay == null
        ? "Discuss with worker"
        : w.hoursPerDay + " hours / day",
    ],
    [
      "Expected pay",
      w.expectedPayInr == null
        ? w.salaryExpectation
        : "₹" +
          w.expectedPayInr.toLocaleString("en-IN") +
          " per " +
          periodLabels[w.payPeriod],
    ],
    [
      "Experience",
      w.experienceYears == null ? null : w.experienceYears + " years",
    ],
    ["Age", w.age],
    ["Food preferences", w.vegNonVeg],
    ["Religion", w.religion],
    ["Lives in", w.livingLocation],
    ["Works in", w.workingLocation],
    ["Can join", w.whenCanJoin],
  ];
  return (
    <div className="bw-workspace">
      <Link href="/workers" className="bw-text-button">
        ← All workers
      </Link>
      <div className="bw-page-head">
        <div>
          <p className="bw-eyebrow">WORKER PROFILE · FREE TO BROWSE</p>
          <h1>{w.name}</h1>
          <p>{w.skill}</p>
        </div>
        <span className="bw-tag">Available</span>
      </div>
      <div className="bw-directory-layout">
        <article className="bw-card">
          <h2>At a glance</h2>
          <dl className="bw-detail-grid">
            {rows
              .filter(([, v]) => v != null && v !== "")
              .map(([k, v]) => (
                <div key={String(k)}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
          </dl>
          {w.about && <p className="bw-description">{w.about}</p>}
          <div className="bw-profile-facts">
            {w.policeVerified && <span>✓ Police verified</span>}
            {w.aadhaarVerified && <span>✓ Aadhaar verified</span>}
          </div>
        </article>
        <aside className="bw-card">
          <h2>Full resume</h2>
          <p className="bw-description">
            Unlock the uploaded resume with one credit. Your unlocked resumes
            stay available in your account.
          </p>
          <ResumeAccess
            worker={w}
            packs={packs}
            loggedIn={loggedIn}
            balance={balance}
          />
        </aside>
      </div>
    </div>
  );
}
