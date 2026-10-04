import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin";
import { PackToggle } from "./PackToggle";
import { PackCreateForm } from "./PackCreateForm";

export const dynamic = "force-dynamic";

export default async function AdminPacksPage() {
  await requireAdminPage("/admin/packs");
  const packs = await prisma.pack.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold">Packs (pricing)</h2>
        <p className="text-sm text-slate-600">
          One-time unlock packs shown on the public site. Toggle active to hide.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold">Create pack</h3>
        <PackCreateForm />
      </section>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Price</th>
              <th className="px-3 py-2">Credits</th>
              <th className="px-3 py-2">Per contact</th>
              <th className="px-3 py-2">Sort</th>
              <th className="px-3 py-2">Active</th>
            </tr>
          </thead>
          <tbody>
            {packs.map((p) => (
              <tr key={p.id} className="border-b border-slate-100">
                <td className="px-3 py-2 font-medium">{p.name}</td>
                <td className="px-3 py-2">₹{p.priceInr}</td>
                <td className="px-3 py-2">{p.credits}</td>
                <td className="px-3 py-2 text-slate-500">
                  ~₹{Math.round(p.priceInr / Math.max(p.credits, 1))}
                </td>
                <td className="px-3 py-2">{p.sortOrder}</td>
                <td className="px-3 py-2">
                  <PackToggle packId={p.id} active={p.active} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
