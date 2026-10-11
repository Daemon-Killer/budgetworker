import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { prisma } from '../src/lib/db';
import { SERVICE_PLANS, SERVICE_DUTIES } from '../src/lib/service-plans';
import { SERVICES } from '../src/lib/services';
import { bookService } from '../src/lib/service-bookings';
import { fulfillOrder, verifyRazorpayPayment } from '../src/lib/payments';
import { todayInIndia, type BookingAnswers } from '../src/lib/service-booking-input';

if (!process.env.DATABASE_URL?.startsWith('postgresql://postgres:postgres@127.0.0.1:')) throw Error('Tests require an isolated database');
async function main() {
  const user = await prisma.user.create({ data: { phone: '9000000077', name: 'Booking test' } });
  const other = await prisma.user.create({ data: { phone: '9000000078' } });
  const expected = [1999,3499,5999,2499,3999,6999,2499,3999,6999,2999,4999,4999,7999,7999,11999,7999,11999,3999,6999,4999,8499];
  assert.deepEqual(SERVICE_PLANS.map(p => p.priceInr), expected);
  assert.deepEqual(SERVICE_PLANS.map(p => p.replacements), [1,2,4,1,2,4,1,2,4,1,2,2,4,2,4,2,4,1,2,1,2]);
  for (const plan of SERVICE_PLANS) {
    const service = SERVICES.find(s => s.slug === plan.serviceSlug)!;
    const answers: BookingAnswers = { city: 'Pune', area: 'Baner', address: 'Flat 201, Test Apartments', pincode: '411045', duties: SERVICE_DUTIES[service.category].slice(0,2), homeSize: '2 BHK', familyMembers: 3, bathrooms: 2, pets: 'No pets', babyType: plan.babyType === 'twins' ? 'twins' : 'single', childAge: service.category === 'JAPA' ? service.employmentType ? 'Newborn' : '0–2 months' : service.category === 'BABYCARE' ? plan.months === 6 ? '6–12 months' : '2–6 months' : 'Not applicable', foodPreference: service.category === 'ALLROUNDER' ? 'Vegetarian' : 'Not applicable', dailyHours: service.employmentType ? 24 : service.slug === "japa-care" ? 1 : 8, startTime: '09:00', weeklyOff: 'Sunday', accommodation: service.employmentType ? 'Private room' : 'Not applicable', startDate: todayInIndia(), monthlySalary: 15000, language: 'Hindi', name: 'Test Client', notes: 'Test booking only' };
    if (service.slug === "domestic-help") { answers.numberOfFloors = "3"; answers.dailyHours = 1; answers.dustingDuration = "1 hour"; answers.moppingMethod = "Hands only"; }
    if (service.slug === "domestic-help") delete answers.monthlySalary;
    const input = { requestId: randomUUID(), serviceSlug: service.slug, planId: plan.id, answers, priceInr: 1, replacements: 100 };
    const result = await bookService(user.id, input);
    assert.equal(result.amountInr, plan.priceInr); assert.equal(result.credits, 0); assert.equal(result.replacements, plan.replacements); assert.equal(result.months, plan.months);
    const saved = await prisma.serviceBooking.findUniqueOrThrow({ where: { id: result.bookingId } });
    assert.equal(saved.status, 'PAID'); assert.equal(saved.priceInr, plan.priceInr);
    assert.deepEqual(saved.answers, answers);
    if (service.slug === "babycare") await assert.rejects(bookService(user.id, { ...input, requestId: randomUUID(), answers: { ...answers, dailyHours: 4 } }), { status: 400 });
    if (!["domestic-help", "japa-care"].includes(service.slug) && !service.employmentType) await assert.rejects(bookService(user.id, { ...input, requestId: randomUUID(), answers: { ...answers, dailyHours: 1 } }), { status: 400 });
    if (service.slug === "japa-care") await assert.rejects(bookService(user.id, { ...input, requestId: randomUUID(), answers: { ...answers, dailyHours: 0 } }), { status: 400 });
    if (service.slug === "domestic-help") await assert.rejects(bookService(user.id, { ...input, requestId: randomUUID(), answers: { ...answers, numberOfFloors: "0" } }), { status: 400 });
    assert.equal((await bookService(user.id, input)).bookingId, saved.id);
    await fulfillOrder(result.orderId, 'duplicate-confirmation');
    assert.equal(await prisma.creditLedger.count({ where: { orderId: result.orderId } }), 0);
    await assert.rejects(bookService(other.id, input), { status: 403 });
    await assert.rejects(bookService(user.id, { ...input, answers: { ...answers, area: 'Changed area' } }), { status: 409 });
    await assert.rejects(bookService(user.id, { ...input, requestId: randomUUID(), planId: 'unknown' }), { status: 400 });
    await assert.rejects(bookService(user.id, { ...input, requestId: randomUUID(), answers: { ...answers, pincode: 'invalid' } }), { status: 400 });
    await assert.rejects(bookService(user.id, { ...input, requestId: randomUUID(), answers: { ...answers, duties: ['Fake duty'] } }), { status: 400 });
    if (service.category === 'JAPA' && service.employmentType && plan.babyType === 'single') await assert.rejects(bookService(user.id, { ...input, requestId: randomUUID(), answers: { ...answers, babyType: 'twins' } }), { status: 400 });
  }
  assert.equal(await prisma.serviceBooking.count(), 21);
  assert.equal(await prisma.order.count(), 21);
  const saved = await prisma.serviceBooking.findFirstOrThrow();
  // Exercise signature verification without contacting or charging any payment provider.
  process.env.RAZORPAY_KEY_SECRET = 'isolated-test-secret';
  await prisma.order.update({ where: { id: saved.orderId }, data: { status: 'PENDING', provider: 'razorpay', providerRef: 'order_isolated' } });
  await prisma.serviceBooking.update({ where: { id: saved.id }, data: { status: 'PENDING' } });
  const verify = { userId: user.id, orderId: saved.orderId, razorpayOrderId: 'order_isolated', razorpayPaymentId: 'pay_isolated', razorpaySignature: 'invalid' };
  await assert.rejects(verifyRazorpayPayment({ ...verify, userId: other.id }), { status: 403 });
  await assert.rejects(verifyRazorpayPayment(verify), { status: 400 });
  assert.equal((await prisma.serviceBooking.findUniqueOrThrow({ where: { id: saved.id } })).status, 'PENDING');
  verify.razorpaySignature = createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update('order_isolated|pay_isolated').digest('hex');
  await verifyRazorpayPayment(verify); await verifyRazorpayPayment(verify);
  assert.equal((await prisma.serviceBooking.findUniqueOrThrow({ where: { id: saved.id } })).status, 'PAID');
  assert.equal(await prisma.creditLedger.count(), 0);
  const client = await prisma.user.create({ data: { phone: '9000000002' } });
  const fixtureAnswers = (await prisma.serviceBooking.findFirstOrThrow({ where: { serviceSlug: 'domestic-help' } })).answers;
  const request = { requestId: randomUUID(), serviceSlug: 'domestic-help', planId: SERVICE_PLANS[0].id, answers: fixtureAnswers };
  const repeated = await Promise.all([bookService(client.id, request), bookService(client.id, request)]);
  assert.equal(repeated[0].bookingId, repeated[1].bookingId);
  assert.equal(await prisma.serviceBooking.count({ where: { userId: client.id } }), 1);
  await prisma.serviceBooking.update({ where: { id: repeated[0].bookingId }, data: { status: 'PENDING' } });
  await prisma.order.update({ where: { id: repeated[0].orderId }, data: { status: 'PENDING', provider: 'razorpay', providerRef: 'order_pending_fixture' } });
  console.log('PASS: 21 subscription prices and replacement allowances; persisted answers; retries; ownership; tamper rejection; verified payment; no resume credits');
}
main().finally(() => prisma.$disconnect()).catch(error => { console.error(error); process.exitCode = 1; });
