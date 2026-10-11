import { prisma } from "./db";
import { RESUME_PLANS } from "./resume-plans";
import { CreditError } from "./credits";
import {
  getPaymentMode,
  getRazorpayClient,
  getRazorpayKeyId,
  inrToPaise,
  verifyPaymentSignature,
} from "./razorpay";

/**
 * Create a pack purchase order.
 * - mock: instant PAID + credits
 * - razorpay: PENDING + Razorpay order for Checkout (test or live keys)
 */
export async function purchasePack(userId: string, packId: string) {
  const selected = RESUME_PLANS.find((plan) => plan.id === packId);
  if (!selected) throw new CreditError("Plan not found", 404);
  const catalogPack = { id: selected.id, name: selected.name, priceInr: selected.priceInr, credits: selected.credits, active: selected.active, sortOrder: selected.sortOrder };
  const pack = await prisma.pack.upsert({
    where: { id: packId },
    create: catalogPack,
    update: catalogPack,
  });
  if (!pack) {
    throw new CreditError("Pack not found", 404);
  }

  const mode = getPaymentMode();

  const order = await prisma.order.create({
    data: {
      userId,
      packId: pack.id,
      amountInr: pack.priceInr,
      credits: pack.credits,
      status: "PENDING",
      provider: mode,
    },
  });

  return checkoutOrder(order.id);
}

/** Reuse the same provider order when a customer retries checkout. */
export async function checkoutOrder(orderId: string) {
  const initial = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  if (initial.status === "PAID") return { orderId, status: "PAID" as const, credits: initial.credits, amountInr: initial.amountInr, alreadyPaid: true };
  if (initial.provider === "mock") return fulfillOrder(orderId, `mock_${orderId}`);
  const order = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id=${orderId} FOR UPDATE`;
    const current = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { pack: true, user: true } });
    if (current.status !== "PAID" && !current.providerRef) {
      const providerOrder = await getRazorpayClient().orders.create({
        amount: inrToPaise(current.amountInr), currency: "INR", receipt: current.id.slice(0, 40),
        notes: { appOrderId: current.id, userId: current.userId, packId: current.packId, credits: String(current.credits) },
      });
      return tx.order.update({ where: { id: current.id }, data: { providerRef: providerOrder.id }, include: { pack: true, user: true } });
    }
    return current;
  }, { timeout: 20000 });
  if (order.status === "PAID") return { orderId, status: "PAID" as const, credits: order.credits, amountInr: order.amountInr, alreadyPaid: true };
  return {
    orderId: order.id, status: "PENDING" as const, mode: "razorpay" as const,
    razorpayOrderId: order.providerRef, amountInr: order.amountInr,
    amountPaise: inrToPaise(order.amountInr), credits: order.credits,
    packName: order.pack.name, keyId: getRazorpayKeyId(),
    prefill: { contact: order.user.phone, name: order.user.name ?? "" },
  };
}

export async function fulfillOrder(orderId: string, providerRef: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id=${orderId} FOR UPDATE`;
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw new CreditError("Order not found", 404);
    if (order.status === "PAID")
      return {
        orderId: order.id,
        status: "PAID" as const,
        credits: order.credits,
        amountInr: order.amountInr,
        alreadyPaid: true,
      };
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${order.userId} FOR UPDATE`;
    await tx.order.update({
      where: { id: orderId },
      data: { status: "PAID", providerRef },
    });
    await tx.serviceBooking.updateMany({ where: { orderId: order.id }, data: { status: "PAID" } });
    if (order.credits > 0) await tx.creditLedger.create({
      data: {
        userId: order.userId,
        delta: order.credits,
        reason: "PACK_PURCHASE",
        orderId: order.id,
      },
    });
    return {
      orderId: order.id,
      status: "PAID" as const,
      credits: order.credits,
      amountInr: order.amountInr,
      alreadyPaid: false,
    };
  });
}

/**
 * Verify Razorpay checkout response and credit the user.
 */
export async function verifyRazorpayPayment(input: {
  orderId: string;
  userId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  const order = await prisma.order.findUnique({ where: { id: input.orderId } });
  if (!order) throw new CreditError("Order not found", 404);
  if (order.userId !== input.userId) {
    throw new CreditError("Order does not belong to you", 403);
  }
  if (order.status === "PAID") {
    return {
      orderId: order.id,
      status: "PAID" as const,
      credits: order.credits,
      amountInr: order.amountInr,
      alreadyPaid: true,
    };
  }

  if (
    order.provider !== "razorpay" ||
    !order.providerRef ||
    order.providerRef !== input.razorpayOrderId
  ) {
    throw new CreditError("Razorpay order mismatch", 400);
  }

  const ok = verifyPaymentSignature({
    razorpayOrderId: input.razorpayOrderId,
    razorpayPaymentId: input.razorpayPaymentId,
    razorpaySignature: input.razorpaySignature,
  });
  if (!ok) {
    await prisma.order.updateMany({
      where: { id: order.id, status: { not: "PAID" } },
      data: { status: "FAILED" },
    });
    throw new CreditError("Payment signature verification failed", 400);
  }

  return fulfillOrder(order.id, input.razorpayPaymentId);
}
