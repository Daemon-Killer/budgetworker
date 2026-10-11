import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasUnlocked, getCreditBalance } from "@/lib/credits";
import { toPublicWorker } from "@/lib/workers";
import { publicWorkerSelect } from "@/lib/directory";
import { WorkerProfile } from "@/components/directory/WorkerProfile";
import { CATEGORIES } from "../../../../shared/marketplace";
export const dynamic = "force-dynamic";
export default async function Profile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [record, session, packs] = await Promise.all([
    prisma.worker.findFirst({
      where: { id, status: "AVAILABLE", onboardingStatus: "APPROVED", category: { in: [...CATEGORIES] } },
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
  return <WorkerProfile key={w.id} initial={w} packs={packs} loggedIn={Boolean(session)} balance={balance} />;
}
