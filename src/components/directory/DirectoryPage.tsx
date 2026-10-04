import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getCreditBalance } from "@/lib/credits";
import { searchWorkers } from "@/lib/directory";
import { getSettings } from "@/lib/marketplace";
import { Directory } from "./Directory";
import Link from 'next/link';
import { emptyFilters, type DirectoryFilters } from "../../../shared/directory";
export async function DirectoryPage({
  params = {},
}: {
  params?: Record<string, string | string[] | undefined>;
}) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params))
    if (typeof v === "string") sp.set(k, v);
  const [session, packs, settings] = await Promise.all([
    getSession(),
    prisma.pack.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, priceInr: true, credits: true },
    }),
    getSettings(),
  ]);
  const initialFilters: DirectoryFilters = { ...emptyFilters };
  for (const key of Object.keys(emptyFilters) as (keyof DirectoryFilters)[])
    if (sp.has(key)) initialFilters[key] = sp.get(key)!;
  let result;
  try { result=await searchWorkers(sp,session?.id); }
  catch(e) {if(e instanceof Error&&'status' in e&&e.status===400)return <div className="bw-card"><p role="alert" className="bw-error">{e.message}</p><Link href="/workers" className="bw-button">Clear search filters</Link></div>;throw e;}
  const balance=session?await getCreditBalance(session.id):0;
  return (
    <>
      {settings.announcement && (
        <p className="bw-announcement">{settings.announcement}</p>
      )}
      <Directory
        key={JSON.stringify(initialFilters)}
        initial={result}
        initialFilters={initialFilters}
        packs={packs}
        loggedIn={Boolean(session)}
        balance={balance}
      />
    </>
  );
}
