import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin";
import type { BookingAnswers } from "@/lib/service-booking-input";

export const dynamic = "force-dynamic";
export default async function AdminBookingsPage() {
  await requireAdminPage("/admin/bookings");
  const bookings = await prisma.serviceBooking.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { user: { select: { phone: true } }, order: { select: { status: true, provider: true, providerRef: true } } } });
  return <div className="space-y-5"><div><h2 className="text-xl font-semibold">Service bookings</h2><p className="text-sm text-slate-600">Client requirements, subscription fee and replacement allowance. Contact the client to confirm availability and joining.</p></div>
    {bookings.length === 0 ? <p>No service bookings yet.</p> : <ul className="grid gap-4 lg:grid-cols-2">{bookings.map(booking => {
      const answers = booking.answers as unknown as BookingAnswers;
      return <li key={booking.id} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 text-sm" style={{ overflowWrap: "anywhere" }}>
        <h3 className="text-base font-bold">{booking.serviceTitle}</h3>
        <p><strong>{answers.name}</strong> · <a href={`tel:+91${booking.user.phone}`} className="text-blue-700">{booking.user.phone}</a></p>
        <p>₹{booking.priceInr.toLocaleString("en-IN")} · {booking.months} months · {booking.replacements} replacements</p>
        <p>Payment: <strong>{booking.order.status}</strong> · {booking.order.provider}{booking.testMode ? " · Test payment (no real money)" : ""}</p>
        <details><summary className="cursor-pointer font-semibold text-blue-700">View all requirements</summary><dl className="mt-3 space-y-3">
          {Object.entries(answers).map(([key, value]) => <div key={key}><dt className="text-xs text-slate-500">{key.replace(/([A-Z])/g, " $1")}</dt><dd>{Array.isArray(value) ? value.join(", ") : String(value)}</dd></div>)}
        </dl></details>
        <p className="text-xs text-slate-500">{booking.createdAt.toLocaleString("en-IN")} · Reference: {booking.id}</p>
      </li>;
    })}</ul>}
  </div>;
}
