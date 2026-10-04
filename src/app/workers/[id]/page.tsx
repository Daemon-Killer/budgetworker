import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasUnlocked, getCreditBalance } from "@/lib/credits";
import { toPublicWorker } from "@/lib/workers";
import { publicWorkerSelect } from "@/lib/directory";
import { ResumeAccess } from "@/components/directory/ResumeAccess";
import { LABELS } from "../../../../shared/marketplace";
import { periodLabels } from "../../../../shared/directory";
export const dynamic = "force-dynamic";
export default async function Profile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [record, session, packs] = await Promise.all([
    prisma.worker.findFirst({
      where: { id, status: "AVAILABLE", onboardingStatus: "APPROVED" },
      select: publicWorkerSelect,
    }),
    getSession(),
    prisma.pack.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, priceInr: true, credits: true },
    }),
  ]);
  if (!record) notFound();
  const [unlocked, balance] = await Promise.all([
    session ? hasUnlocked(session.id, id) : Promise.resolve(false),
    session ? getCreditBalance(session.id) : Promise.resolve(0),
  ]);
  const w = toPublicWorker(record, unlocked);
  const rows = [
    ["Type of help", LABELS[w.category]],
    [
      "Work arrangement",
      w.employmentType === "PART_TIME" ? "Part time" : "Full time",
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
            loggedIn={Boolean(session)}
            balance={balance}
          />
        </aside>
      </div>
    </div>
  );
}
