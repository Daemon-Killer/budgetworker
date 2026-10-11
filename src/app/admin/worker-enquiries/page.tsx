import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/db";
import type { WorkerLeadInput } from "@/lib/worker-lead-input";

export const dynamic = "force-dynamic";
export default async function WorkerEnquiriesPage() {
  await requireAdminPage("/admin/worker-enquiries");
  const leads = await prisma.workerLead.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return <div className="space-y-5"><header><h2 className="text-xl font-semibold">Worker registrations & referrals</h2><p className="mt-1 text-sm text-slate-600">Review the submitted details and contact the worker before creating an approved worker profile.</p></header>
    <Link href="/admin/workers" className="text-sm font-semibold text-blue-700">Manage worker profiles →</Link>
    {!leads.length ? <p className="text-sm text-slate-600">No submissions yet.</p> : <ul className="grid gap-4 lg:grid-cols-2">{leads.map(lead => {
      const details = lead.details as unknown as WorkerLeadInput;
      return <li key={lead.id} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 text-sm" style={{ overflowWrap: "anywhere" }}>
        <p className="text-xs font-semibold text-blue-700">{lead.kind === "REFER" ? "Worker referral" : "Work registration"} · {lead.status}</p><h3 className="text-lg font-bold">{lead.name}</h3>
        <p><a className="text-blue-700" href={`tel:+91${lead.phone}`}>{lead.phone}</a> · {lead.city}, {lead.area}</p>
        {details.alternatePhone && <p>Alternate worker mobile number: <a className="text-blue-700" href={`tel:+91${details.alternatePhone}`}>{details.alternatePhone}</a></p>}
        <p>{details.workTypes.join(", ")} · {details.arrangements.join(", ")}</p>
        <details><summary className="cursor-pointer font-semibold text-blue-700">View full details</summary><dl className="mt-3 space-y-3">
          {[['Age / gender', `${details.age} · ${details.gender}`], ['Experience', `${details.experience} years`], ['Languages', details.languages.join(", ")], ['Part-time hours', details.arrangements.includes("Part-time") ? `${details.dailyHours} hours/day` : 'Not applicable'], ['Expected monthly salary', `₹${details.monthlySalary.toLocaleString("en-IN")}`], ['Availability', details.availability], ['Other details', details.notes || 'None']].map(([label,value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd>{value}</dd></div>)}
          {lead.kind === "REFER" && <div><dt className="text-xs text-slate-500">Referred by</dt><dd>{details.referrerName} · <a href={`tel:+91${details.referrerPhone}`} className="text-blue-700">{details.referrerPhone}</a> · {details.relationship}</dd></div>}
        </dl></details><p className="text-xs text-slate-500">{lead.createdAt.toLocaleString("en-IN")} · Reference: {lead.id}</p>
      </li>;
    })}</ul>}
  </div>;
}
