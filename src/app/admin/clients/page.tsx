import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin";
import { GrantCreditsButton } from "./GrantCreditsButton";

export const dynamic = "force-dynamic";

export default async function AdminClientsPage() {
  await requireAdminPage("/admin/clients");

  const users = await prisma.user.findMany({
    where: { role: "CLIENT" },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { unlocks: true, orders: true } },
      ledger: { select: { delta: true } },
    },
  });

  const rows = users.map((u) => ({
    id: u.id,
    phone: u.phone,
    name: u.name,
    createdAt: u.createdAt,
    unlocks: u._count.unlocks,
    orders: u._count.orders,
    balance: u.ledger.reduce((s, l) => s + l.delta, 0),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Clients (demand)</h2>
        <p className="text-sm text-slate-600">
          Families who logged in. Grant credits for support / dead-number goodwill.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">No clients yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Credits</th>
                <th className="px-3 py-2">Unlocks</th>
                <th className="px-3 py-2">Orders</th>
                <th className="px-3 py-2">Joined</th>
                <th className="px-3 py-2">Support</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-mono text-xs">{r.phone}</td>
                  <td className="px-3 py-2">{r.name || "—"}</td>
                  <td className="px-3 py-2 font-semibold tabular-nums">{r.balance}</td>
                  <td className="px-3 py-2 tabular-nums">{r.unlocks}</td>
                  <td className="px-3 py-2 tabular-nums">{r.orders}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {r.createdAt.toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-3 py-2">
                    <GrantCreditsButton userId={r.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
