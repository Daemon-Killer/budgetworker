import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { SERVICES } from "./services";
import { SERVICE_PLANS } from "./service-plans";
import { serviceBookingSchema } from "./service-booking-input";
import { checkoutOrder } from "./payments";
import { getPaymentMode, getRazorpayKeyId } from "./razorpay";
import { CreditError } from "./credits";

export async function bookService(userId: string, body: unknown) {
  const parsed = serviceBookingSchema.safeParse(body);
  if (!parsed.success) throw new CreditError(parsed.error.issues[0]?.message ?? "Check your booking details", 400);
  const input = parsed.data;
  const service = SERVICES.find(item => item.slug === input.serviceSlug)!;
  const plan = SERVICE_PLANS.find(item => item.id === input.planId)!;
  let booking = await prisma.serviceBooking.findUnique({ where: { requestId: input.requestId } });
  if (!booking) {
    const mode = getPaymentMode();
    const testMode = mode === "mock" || getRazorpayKeyId().startsWith("rzp_test_");
    try {
      booking = await prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR UPDATE`;
        const existing = await tx.serviceBooking.findUnique({ where: { requestId: input.requestId } });
        if (existing) return existing;
        const pack = await tx.pack.upsert({ where: { id: plan.id },
          create: { id: plan.id, name: plan.name, priceInr: plan.priceInr, credits: 0, active: false },
          update: { name: plan.name, priceInr: plan.priceInr, credits: 0, active: false },
        });
        const order = await tx.order.create({ data: { userId, packId: pack.id, amountInr: plan.priceInr, credits: 0, provider: mode } });
        return tx.serviceBooking.create({ data: {
          requestId: input.requestId, userId, serviceSlug: service.slug, serviceTitle: service.title,
          planId: plan.id, months: plan.months, priceInr: plan.priceInr, replacements: plan.replacements, testMode,
          answers: input.answers, orderId: order.id,
        } });
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
      booking = await prisma.serviceBooking.findUniqueOrThrow({ where: { requestId: input.requestId } });
    }
  }
  if (booking.userId !== userId) throw new CreditError("Booking does not belong to you", 403);
  if (booking.planId !== input.planId || JSON.stringify(booking.answers) !== JSON.stringify(input.answers)) {
    // PostgreSQL JSONB may reorder keys; compare their canonical values instead.
    const original = serviceBookingSchema.parse({ ...input, answers: booking.answers });
    if (booking.planId !== input.planId || JSON.stringify(original.answers) !== JSON.stringify(input.answers)) throw new CreditError("Booking details changed. Please review and start a new booking.", 409);
  }
  const payment = await checkoutOrder(booking.orderId);
  return { ...payment, testMode: booking.testMode, bookingId: booking.id, months: booking.months, replacements: booking.replacements };
}
