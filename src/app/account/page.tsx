import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCreditBalance } from "@/lib/credits";
import { categoryLabel } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [balance, unlocks, orders] = await Promise.all([
    getCreditBalance(session.id),
    prisma.unlock.findMany({
      where: { userId: session.id },
      include: { worker: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.findMany({
      where: { userId: session.id, status: "PAID" },
      include: { pack: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="text-sm text-slate-600">
          {session.phone}
          {session.name ? ` · ${session.name}` : ""}
          {session.role === "ADMIN" ? " · Admin" : ""}
        </p>
        <p className="mt-2 text-lg font-semibold text-emerald-800">
          {balance} resume credits remaining
        </p>
        <Link href="/packs" className="text-sm font-medium text-indigo-700 hover:underline">
          Buy more packs
        </Link>
      </div>

      <Link href="/bookings" className="bw-button secondary">My service bookings →</Link>

      <section>
        <h2 className="font-semibold">Unlocked resumes</h2>
        {unlocks.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">
            None yet.{" "}
            <Link href="/workers" className="text-indigo-700 hover:underline">
              Browse directory
            </Link>
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {unlocks.map((u) => (
              <li
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
              >
                <div>
                  <Link
                    href={`/workers/${u.worker.id}`}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {u.worker.name}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {categoryLabel(u.worker.category)} ·{" "}
                    {new Date(u.createdAt).toLocaleDateString()}
                    {u.worker.resumeFileName ? ` · ${u.worker.resumeFileName}` : ""}
                  </p>
                </div>
                {u.worker.resumeFileName ? (
                  <a
                    href={`/api/workers/${u.worker.id}/resume`}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Download resume
                  </a>
                ) : (
                  <span className="text-xs text-slate-400">No file</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-semibold">Purchase history</h2>
        {orders.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">No purchases yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {orders.map((o) => (
              <li key={o.id} className="flex justify-between px-4 py-3 text-sm">
                <span>
                  {o.pack.name}{o.credits > 0 ? ` · +${o.credits} resume credits` : " · Service subscription"}
                </span>
                <span className="text-slate-600">
                  ₹{o.amountInr} · {new Date(o.createdAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
