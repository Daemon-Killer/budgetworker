import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getCreditBalance } from "@/lib/credits";
import { PackPurchase } from "./PackPurchase";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PacksPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const fromMobile = (await searchParams).from === "mobile";
  const packs = await prisma.pack.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });
  const session = await getSession();
  const balance = session ? await getCreditBalance(session.id) : 0;
  const featured = packs[1] ?? packs[0];

  return (
    <div className="space-y-8">
      {fromMobile && (
        <a href="budgetworker://consumer" className="bw-button secondary">
          Return to the app ↗
        </a>
      )}
      <div className="max-w-xl">
        <p className="hh-section-label">Pricing</p>
        <h1 className="hh-section-title">Resume packs — cheap &amp; clear</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          The worker directory stays free. Packs buy unlock credits:{" "}
          <strong className="text-slate-900">1 credit = 1 full resume</strong>,
          re-download free forever.
          {session ? (
            <span className="ml-1 font-semibold text-emerald-700">
              {" "}
              Balance: {balance}
            </span>
          ) : null}
        </p>
        <Link
          href="/workers"
          className="mt-3 inline-block text-sm font-semibold text-blue-700 hover:text-blue-900"
        >
          ← Back to free directory
        </Link>
      </div>

      {packs.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
          No packs yet.
        </p>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-3">
          {packs.map((p) => {
            const popular = featured && p.id === featured.id;
            return (
              <li
                key={p.id}
                className={`relative flex flex-col rounded-2xl p-6 ${
                  popular
                    ? "bg-gradient-to-b from-blue-600 to-indigo-800 text-white shadow-xl shadow-blue-600/20 ring-2 ring-pink-400/40"
                    : "hh-card"
                }`}
              >
                {popular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-pink-500 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Popular
                  </span>
                )}
                <p
                  className={`text-sm font-semibold ${popular ? "text-blue-100" : "text-slate-500"}`}
                >
                  {p.name}
                </p>
                <p className="mt-2 text-4xl font-bold tracking-tight">
                  ₹{p.priceInr}
                </p>
                <p
                  className={`mt-1 text-sm ${popular ? "text-blue-100" : "text-slate-600"}`}
                >
                  {p.credits} resume unlocks
                </p>
                <p
                  className={`text-xs ${popular ? "text-blue-200/80" : "text-slate-400"}`}
                >
                  ~₹{Math.round(p.priceInr / Math.max(p.credits, 1))} per resume
                </p>
                <ul
                  className={`mt-4 space-y-1.5 text-xs ${popular ? "text-blue-100" : "text-slate-500"}`}
                >
                  <li>· One-time — not a subscription</li>
                  <li>· Credits never expire</li>
                  <li>· Re-download free after unlock</li>
                </ul>
                <div className="mt-auto pt-5">
                  <PackPurchase packId={p.id} loggedIn={Boolean(session)} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
