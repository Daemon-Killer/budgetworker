import assert from "node:assert/strict";
import { prisma } from "../src/lib/db";
import { requestOtp, verifyOtp } from "../src/lib/auth";

if (process.env.OTP_TEST_ISOLATED !== "true" || !process.env.DATABASE_URL?.startsWith("postgresql://postgres:postgres@127.0.0.1:")) {
  throw new Error("OTP fixtures require the isolated local database");
}
const code = process.env.DEV_OTP_CODE!;
const phone = "9000000001";
const future = () => new Date(Date.now() + 10 * 60 * 1000);

async function main() {
  // Old provider attempts must not block the approved private test login.
  await prisma.otpCode.createMany({ data: Array.from({ length: 8 }, () => ({ phone, code: "123456", expiresAt: future() })) });
  await Promise.all(Array.from({ length: 8 }, () => requestOtp(phone)));
  assert.equal(await prisma.otpCode.count({ where: { phone, code } }), 1);
  const active = await prisma.otpCode.findFirstOrThrow({ where: { phone, code } });
  const response = await requestOtp(phone);
  assert.deepEqual(response, { ok: true, mode: "dev" });
  await assert.rejects(() => verifyOtp(phone, "00000000", undefined, true), { status: 400 });
  await requestOtp(phone);
  const resent = await prisma.otpCode.findUniqueOrThrow({ where: { id: active.id } });
  assert.equal(resent.attempts, 1);
  assert.equal(resent.expiresAt.getTime(), active.expiresAt.getTime());
  assert.equal(resent.createdAt.getTime(), active.createdAt.getTime());
  assert.equal((await verifyOtp(phone, code, undefined, true)).role, "ADMIN");
  await assert.rejects(() => verifyOtp(phone, code, undefined, true), { status: 400 });
  // More than five successful logins are allowed; each still consumes its challenge.
  for (let i = 0; i < 6; i++) {
    await requestOtp(phone);
    await verifyOtp(phone, code, undefined, true);
  }
  await requestOtp(phone);
  const simultaneous = await Promise.allSettled(Array.from({ length: 4 }, () => verifyOtp(phone, code, undefined, true)));
  assert.equal(simultaneous.filter(r => r.status === "fulfilled").length, 1);

  const lockedPhone = "9000000002";
  await requestOtp(lockedPhone);
  for (let i = 0; i < 5; i++) {
    await assert.rejects(() => verifyOtp(lockedPhone, "00000000", undefined, true), { status: 400 });
  }
  await requestOtp(lockedPhone);
  assert.equal(await prisma.otpCode.count({ where: { phone: lockedPhone } }), 1);
  await assert.rejects(() => verifyOtp(lockedPhone, code, undefined, true), { status: 429 });
  assert.equal((await prisma.otpCode.findFirstOrThrow({ where: { phone: lockedPhone } })).attempts, 5);
  await prisma.otpCode.updateMany({ where: { phone: lockedPhone }, data: { expiresAt: new Date(0) } });
  await assert.rejects(() => verifyOtp(lockedPhone, code, undefined, true), { status: 400 });
  await requestOtp(lockedPhone);
  assert.equal((await verifyOtp(lockedPhone, code, undefined, true)).role, "CLIENT");

  const cappedPhone = "9000000003";
  await prisma.otpCode.createMany({ data: Array.from({ length: 30 }, () => ({ phone: cappedPhone, code, consumed: true, expiresAt: future() })) });
  await assert.rejects(() => requestOtp(cappedPhone), { status: 429 });
  // Reusing an already issued challenge does not spend another allowance.
  await prisma.otpCode.create({ data: { phone: cappedPhone, code, expiresAt: future() } });
  await requestOtp(cappedPhone);
  await verifyOtp(cappedPhone, code, undefined, true);
  await assert.rejects(() => requestOtp("9000000004"), { status: 403 });

  process.env.OTP_MODE = "msg91";
  const smsPhone = "9000000005";
  await prisma.otpCode.createMany({ data: Array.from({ length: 4 }, () => ({ phone: smsPhone, code: "123456", expiresAt: future() })) });
  // No provider credentials, so no SMS is actually sent by this test.
  await assert.rejects(() => requestOtp(smsPhone), { status: 503 });
  await assert.rejects(() => requestOtp(smsPhone), { status: 429 });
  assert.equal(await prisma.otpCode.count({ where: { phone: smsPhone } }), 5);
  console.log("PASS: old SMS attempts do not block test login; concurrent resends reuse a challenge; expiry, attempts, one-use login, admin allowlist, test and SMS limits hold.");
}
main().finally(() => prisma.$disconnect());
