import { getSession } from "@/lib/auth";
import { getCreditBalance } from "@/lib/credits";
import { RESUME_PLAN_GROUPS, RESUME_PLANS } from "@/lib/resume-plans";
import { PackPurchase } from "./PackPurchase";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PacksPage({ searchParams }: {
  searchParams: Promise<{ from?: string }>;
}) {
  const fromMobile = (await searchParams).from === "mobile";
  const session = await getSession();
  const balance = session ? await getCreditBalance(session.id) : 0;
  return (
    <div className="space-y-8">
      {fromMobile && <a href="budgetworker://consumer" className="bw-button secondary">Return to the app ↗</a>}
      <header className="max-w-3xl space-y-3">
        <p className="hh-section-label">Choose your plan</p>
        <h1 className="hh-section-title">Resume + Interview Booking Plans</h1>
        <p className="text-sm leading-relaxed text-slate-600">Choose the type of help and number of worker profiles you need. Every price below is the total resume profile + interview booking fee for that plan.</p>
        <p className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-relaxed text-slate-700">One-time fee. Worker salary and service subscription fees are separate. Interview timing is confirmed based on worker availability; purchasing a plan does not guarantee hiring.</p>
        {session && <p className="text-sm font-semibold text-green-700">Your resume credits: {balance}</p>}
        <Link href="/workers" className="inline-block text-sm font-semibold text-blue-700">Browse worker profiles →</Link>
      </header>
      {RESUME_PLAN_GROUPS.map((group) => (
        <section key={group.id} aria-labelledby={`heading-${group.id}`} className="space-y-4" data-plan-group={group.id}>
          <div>
            <h2 id={`heading-${group.id}`} className="text-xl font-bold text-slate-900">{group.title}</h2>
            <p className="mt-1 text-sm font-medium text-slate-600">{group.description}</p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {RESUME_PLANS.filter((plan) => plan.groupId === group.id).map((plan) => (
              <li key={plan.id} data-plan-id={plan.id} className="hh-card flex flex-col p-5">
                <h3 className="text-lg font-bold text-slate-900">{plan.credits} {plan.credits === 1 ? "resume profile" : "resume profiles"}</h3>
                <p className="mt-1 text-sm text-slate-600">+ Interview booking</p>
                <p className="mt-4 text-3xl font-bold text-blue-800">₹{plan.priceInr.toLocaleString("en-IN")} <span data-gst-label style={{ fontSize: "0.5em", display: "inline", whiteSpace: "nowrap" }}>+ GST</span></p>
                <p className="mt-1 text-xs text-slate-500">One-time booking fee before GST</p>
                <div className="mt-auto pt-5"><PackPurchase packId={plan.id} loggedIn={Boolean(session)} /></div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
