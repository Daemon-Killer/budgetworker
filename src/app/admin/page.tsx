import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireAdminPage("/admin");

  const [
    workersAvailable,
    workersPlaced,
    workersTotal,
    clients,
    unlocks,
    paidOrders,
    revenue,
    recentUnlocks,
    recentOrders,
  ] = await Promise.all([
    prisma.worker.count({ where: { status: "AVAILABLE" } }),
    prisma.worker.count({ where: { status: "PLACED" } }),
    prisma.worker.count(),
    prisma.user.count({ where: { role: "CLIENT" } }),
    prisma.unlock.count(),
    prisma.order.count({ where: { status: "PAID" } }),
    prisma.order.aggregate({
      where: { status: "PAID" },
      _sum: { amountInr: true },
    }),
    prisma.unlock.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { phone: true, name: true } },
        worker: { select: { name: true, category: true } },
      },
    }),
    prisma.order.findMany({
      take: 8,
      where: { status: "PAID" },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { phone: true, name: true } },
        pack: { select: { name: true } },
      },
    }),
  ]);

  const stats = [
    {
      label: "Workers available",
      value: workersAvailable,
      href: "/admin/workers",
      tone: "blue",
    },
    {
      label: "Workers placed",
      value: workersPlaced,
      href: "/admin/workers",
      tone: "pink",
    },
    {
      label: "Clients",
      value: clients,
      href: "/admin/clients",
      tone: "blue",
    },
    {
      label: "Unlocks",
      value: unlocks,
      href: "/admin/clients",
      tone: "pink",
    },
    {
      label: "Paid orders",
      value: paidOrders,
      href: "/admin/orders",
      tone: "blue",
    },
    {
      label: "Revenue (paid)",
      value: `₹${revenue._sum.amountInr ?? 0}`,
      href: "/admin/orders",
      tone: "pink",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold">Dashboard</h2>
        <p className="text-sm text-slate-600">
          Snapshot for calling / marketing / ops · {workersTotal} workers in DB
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <li key={s.label}>
            <Link
              href={s.href}
              className={`block rounded-xl border bg-white p-4 shadow-sm transition hover:shadow ${
                s.tone === "pink" ? "border-pink-100 hover:border-pink-200" : "border-blue-100 hover:border-blue-200"
              }`}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {s.label}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                {s.value}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Recent unlocks</h3>
            <Link href="/admin/clients" className="text-xs text-blue-700 hover:underline">
              Clients
            </Link>
          </div>
          {recentUnlocks.length === 0 ? (
            <p className="text-sm text-slate-500">No unlocks yet.</p>
          ) : (
            <ul className="divide-y text-sm">
              {recentUnlocks.map((u) => (
                <li key={u.id} className="flex justify-between gap-2 py-2">
                  <span>
                    <span className="font-medium">{u.user.phone}</span>
                    <span className="text-slate-500"> → {u.worker.name}</span>
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">
                    {u.createdAt.toLocaleString("en-IN")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Recent paid orders</h3>
            <Link href="/admin/orders" className="text-xs text-blue-700 hover:underline">
              Orders
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-slate-500">No paid orders yet.</p>
          ) : (
            <ul className="divide-y text-sm">
              {recentOrders.map((o) => (
                <li key={o.id} className="flex justify-between gap-2 py-2">
                  <span>
                    <span className="font-medium">{o.user.phone}</span>
                    <span className="text-slate-500">
                      {" "}
                      · {o.pack.name} · +{o.credits} cr
                    </span>
                  </span>
                  <span className="shrink-0 font-medium">₹{o.amountInr}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-dashed border-slate-300 bg-white/80 p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-800">Internal routes (path-based, no subdomain)</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            <code>/admin</code> — dashboard
          </li>
          <li>
            <code>/admin/workers</code> — supply (add / status / call notes)
          </li>
          <li>
            <code>/admin/clients</code> — demand + credit balances
          </li>
          <li>
            <code>/admin/orders</code> — pack purchases
          </li>
          <li>
            <code>/admin/packs</code> — pricing packs
          </li>
        </ul>
      </section>
    </div>
  );
}
