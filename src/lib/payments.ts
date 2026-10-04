import { prisma } from "./db";
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
  const pack = await prisma.pack.findFirst({
    where: { id: packId, active: true },
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

  if (mode === "mock") {
    return fulfillOrder(order.id, `mock_${order.id}`);
  }

  const rzp = getRazorpayClient();
  const rzpOrder = await rzp.orders.create({
    amount: inrToPaise(pack.priceInr),
    currency: "INR",
    receipt: order.id.slice(0, 40),
    notes: {
      appOrderId: order.id,
      userId,
      packId: pack.id,
      credits: String(pack.credits),
    },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { providerRef: rzpOrder.id },
  });

  const user = await prisma.user.findUnique({ where: { id: userId } });

  return {
    orderId: order.id,
    status: "PENDING" as const,
    mode: "razorpay" as const,
    razorpayOrderId: rzpOrder.id,
    amountInr: pack.priceInr,
    amountPaise: inrToPaise(pack.priceInr),
    credits: pack.credits,
    packName: pack.name,
    keyId: getRazorpayKeyId(),
    prefill: {
      contact: user?.phone ?? "",
      name: user?.name ?? "",
    },
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
    await tx.creditLedger.create({
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
