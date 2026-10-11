import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { BookingAnswers } from "@/lib/service-booking-input";

export const dynamic = "force-dynamic";
export default async function MyBookingsPage() {
  const user = await getSession();
  if (!user) redirect("/login?next=/bookings");
  const bookings = await prisma.serviceBooking.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100, include: { order: true } });
  return <div className="space-y-6">
    <div><h1 className="hh-section-title">My service bookings</h1><p className="mt-2 text-sm text-slate-600">Your subscription plans, requirements and payment status.</p></div>
    <Link href="/services" className="bw-button secondary">Browse services</Link>
    {bookings.length === 0 ? <p className="text-sm text-slate-600">You have no service bookings yet.</p> : <ul className="grid gap-5 md:grid-cols-2">
      {bookings.map(booking => { const answers = booking.answers as unknown as BookingAnswers; const test = booking.testMode;
        return <li key={booking.id} className="hh-card space-y-3 p-5" style={{ overflowWrap: "anywhere" }}>
          <h2 className="text-lg font-bold">{booking.serviceTitle}</h2>
          <p className="text-sm text-slate-600">{answers.city} · {answers.area}{["Newborn", "Under 1 year", "2–12 months", "2–6 months", "6–12 months", "1–3 years", "4–6 years", "7+ years"].includes(answers.childAge) ? ` · ${answers.babyType === "twins" ? "Twins" : "Single baby"}` : ""}</p>
          <p className="text-xl font-bold text-blue-800">₹{booking.priceInr.toLocaleString("en-IN")} <span className="text-sm font-normal text-slate-600">/ {booking.months} {booking.months === 1 ? "month" : "months"}</span></p>
          <p className="text-sm font-semibold text-green-700">{booking.replacements} {booking.replacements === 1 ? "replacement" : "replacements"} included</p>
          <p className="text-sm">Payment: <strong>{booking.status === "PAID" ? test ? "Test payment — no real money charged" : "Confirmed" : "Pending"}</strong></p>
          <p className="text-sm text-slate-600">Preferred joining: {answers.startDate}{answers.monthlySalary !== undefined ? ` · Monthly worker salary: ₹${answers.monthlySalary.toLocaleString("en-IN")} (separate)` : " · Worker salary is confirmed separately."}</p>
          <p className="text-xs text-slate-500">Reference: {booking.id}</p>
          <details className="text-sm"><summary className="cursor-pointer font-semibold text-blue-700">View requirements</summary><div className="mt-3 space-y-2"><p>{answers.duties.join(", ")}</p><p>{answers.address}, {answers.area}, {answers.city} – {answers.pincode}</p><p>{answers.dailyHours === 24 ? `Live-in · ${answers.accommodation}` : `${answers.dailyHours} hours/day · ${answers.startTime}`} · Weekly off: {answers.weeklyOff}</p><p>{answers.homeSize} · {answers.familyMembers} people · {answers.bathrooms} bathrooms · {answers.pets}</p>{booking.serviceSlug === "domestic-help" && answers.numberOfFloors && <p>Floors to clean: {answers.numberOfFloors}</p>}<p>{answers.notes}</p></div></details>
          <p className="text-xs text-slate-500">The team confirms availability, final duties and joining date with you.</p>
          {booking.status !== "PAID" && <Link href={`/services/${booking.serviceSlug}/book?booking=${booking.id}`} className="text-sm font-semibold text-blue-700">Resume payment →</Link>}
        </li>;
      })}
    </ul>}
  </div>;
}
