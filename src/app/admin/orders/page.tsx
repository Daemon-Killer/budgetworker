import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  await requireAdminPage("/admin/orders");

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { phone: true, name: true } },
      pack: { select: { name: true } },
    },
  });

  const paidSum = orders
    .filter((o) => o.status === "PAID")
    .reduce((s, o) => s + o.amountInr, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Orders (payments)</h2>
        <p className="text-sm text-slate-600">
          Pack purchases · paid total on this page:{" "}
          <strong className="text-slate-900">₹{paidSum}</strong>
        </p>
      </div>

      {orders.length === 0 ? (
        <p className="text-sm text-slate-500">No orders yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Client</th>
                <th className="px-3 py-2">Pack</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Credits</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Provider</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-slate-100">
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {o.createdAt.toLocaleString("en-IN")}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{o.user.phone}</td>
                  <td className="px-3 py-2">{o.pack.name}</td>
                  <td className="px-3 py-2 font-medium">₹{o.amountInr}</td>
                  <td className="px-3 py-2">+{o.credits}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        o.status === "PAID"
                          ? "text-emerald-700"
                          : o.status === "FAILED"
                            ? "text-red-600"
                            : "text-amber-700"
                      }
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {o.provider}
                    {o.providerRef ? ` · ${o.providerRef.slice(0, 12)}` : ""}
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
