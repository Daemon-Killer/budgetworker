import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { SERVICES } from "@/lib/services";
import { prisma } from "@/lib/db";
import type { BookingAnswers } from "@/lib/service-booking-input";
import { BookingForm } from "./BookingForm";

export const dynamic = "force-dynamic";
export default async function ServiceBookingPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ booking?: string }> }) {
  const { slug } = await params;
  const service = SERVICES.find(item => item.slug === slug);
  if (!service) notFound();
  const session = await getSession();
  const { booking: bookingId } = await searchParams;
  if (bookingId && !session) redirect(`/login?next=${encodeURIComponent(`/services/${slug}/book?booking=${bookingId}`)}`);
  const saved = bookingId && session ? await prisma.serviceBooking.findFirst({ where: { id: bookingId, userId: session.id, serviceSlug: slug } }) : null;
  if (bookingId && !saved) notFound();
  if (saved?.status === "PAID") redirect("/bookings");
  const initialBooking = saved ? { answers: saved.answers as unknown as BookingAnswers, planId: saved.planId, requestId: saved.requestId } : undefined;
  return <div className="space-y-5">
    <Link href={`/services/${slug}`} className="text-sm font-semibold text-blue-700">← Back to service</Link>
    <header><h1 className="hh-section-title">Book {service.title}</h1><p className="mt-2 text-sm text-slate-600">Tell us what your home needs, then choose your subscription plan.</p></header>
    <BookingForm service={service} loggedIn={Boolean(session)} customerName={session?.name ?? ""} phone={session?.phone ?? ""} initialBooking={initialBooking} />
  </div>;
}
