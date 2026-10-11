import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getCreditBalance, hasUnlocked } from "@/lib/credits";
import { publicWorkerSelect } from "@/lib/directory";
import { toPublicWorker } from "@/lib/workers";
import { RequestInterview } from "@/components/interviews/RequestInterview";

export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ worker?: string }> }) {
  const { worker: workerId } = await searchParams;
  if (!workerId) redirect("/workers");
  const session = await getSession();
  if (!session) redirect("/login?next=" + encodeURIComponent("/interviews/request?worker=" + workerId));
  const [worker, unlocked, balance, packs] = await Promise.all([
    prisma.worker.findFirst({ where: { id: workerId, status: "AVAILABLE", onboardingStatus: "APPROVED" }, select: publicWorkerSelect }),
    hasUnlocked(session.id, workerId), getCreditBalance(session.id),
    prisma.pack.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, credits: true, priceInr: true } }),
  ]);
  if (!worker) notFound();
  return <RequestInterview worker={toPublicWorker(worker, unlocked)} packs={packs} balance={balance} />;
}
