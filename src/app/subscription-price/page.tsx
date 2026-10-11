import Link from "next/link";
import { SERVICES } from "@/lib/services";
import { SERVICE_PLANS } from "@/lib/service-plans";

export const metadata = { title: "Subscription Price | BudgetWorker" };
export default function SubscriptionPricePage() {
  return <div className="space-y-8">
    <header className="max-w-3xl space-y-3">
      <h1 className="hh-section-title">Subscription Price</h1>
      <p className="text-sm leading-relaxed text-slate-600">Choose your service and work arrangement. Each plan shows the total subscription fee and replacements included during that period.</p>
      <p className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-slate-700">Worker salary is separate. These are service subscription fees, payable once for the chosen duration, with no automatic renewal. Resume + interview booking plans are a separate offering.</p>
    </header>
    {SERVICES.flatMap(service => {
      const types = service.category === "JAPA" && service.employmentType === "LIVE_IN" ? ["single", "twins"] : ["any"];
      return types.map(babyType => {
        const plans = SERVICE_PLANS.filter(plan => plan.serviceSlug === service.slug && plan.babyType === babyType);
        const title = service.category === "HOUSEKEEPING" ? "Domestic Help (Housekeeping)" : service.category === "ALLROUNDER" ? "All-rounder" : service.category === "BABYCARE" ? "Babycare" : "Japa Care";
        const arrangement = service.employmentType === "LIVE_IN" ? "24-hour Live-in" : "Part-time";
        const babyLabel = babyType === "single" ? " · Single baby" : babyType === "twins" ? " · Twins" : "";
        const group = `${service.slug}-${babyType}`;
        return <section key={group} data-subscription-group={group} aria-labelledby={`plan-heading-${group}`} className="space-y-4">
          <div><h2 id={`plan-heading-${group}`} className="text-xl font-bold text-slate-900">{title}</h2><p className="mt-1 text-sm font-semibold text-blue-700">{arrangement}{babyLabel}</p></div>
          {service.employmentType === "LIVE_IN" && <p data-live-in-transport className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-relaxed text-slate-700"><strong>Transportation expenses:</strong> The client pays the transportation expenses for every 24-hour Live-in worker, including both the first worker and any replacement worker. These expenses are separate from the subscription fee.</p>}
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{plans.map(plan => <li key={plan.id} data-subscription-plan={plan.id} className="hh-card flex flex-col gap-3 p-5">
            <h3 className="text-lg font-bold">{plan.months} {plan.months === 1 ? "month" : "months"}</h3>
            <p className="text-3xl font-bold text-blue-800">₹{plan.priceInr.toLocaleString("en-IN")} <span data-gst-label style={{ fontSize: "0.5em", display: "inline", whiteSpace: "nowrap" }}>+ GST</span></p>
            <p className="text-sm text-slate-600">Subscription fee before GST</p>
            <p className="text-sm font-semibold text-green-700">{plan.replacements} {plan.replacements === 1 ? "replacement" : "replacements"} included</p>
          </li>)}</ul>
          <Link href={`/services/${service.slug}`} className="inline-block text-sm font-semibold text-blue-700">View service →</Link>
        </section>;
      });
    })}
  </div>;
}
