import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import { APP_NAME } from "@/lib/constants";
import { LogoutButton } from "@/components/LogoutButton";

const NAV = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/marketplace", label: "Website content" },
  { href: "/admin/workers", label: "Workers" },
  { href: "/admin/interviews", label: "Interviews" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/packs", label: "Packs" },
] as const;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdminPage();

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-100 text-slate-900 md:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-r border-slate-200 bg-slate-900 text-white md:w-56">
        <div className="border-b border-white/10 px-4 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-pink-300">
            Internal
          </p>
          <p className="mt-0.5 text-sm font-semibold">{APP_NAME}</p>
          <p className="truncate text-xs text-slate-400">{session.phone}</p>
        </div>
        <nav className="flex flex-row gap-0.5 overflow-x-auto p-2 text-sm md:flex-1 md:flex-col">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-lg px-3 py-2 text-slate-200 hover:bg-white/10 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden space-y-2 border-t border-white/10 p-3 text-xs md:block">
          <Link href="/" className="block text-slate-400 hover:text-white">
            ← Public site
          </Link>
          <div className="text-slate-500">
            <LogoutButton />
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div>
            <h1 className="text-sm font-semibold text-slate-800">Ops console</h1>
            <p className="text-xs text-slate-500">
              Worker profiles, resumes & website settings ·{" "}
              <code className="rounded bg-slate-100 px-1">budgetworker.in/admin</code>
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
            ADMIN
          </span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
