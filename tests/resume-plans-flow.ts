import assert from 'node:assert/strict';
import { prisma } from '../src/lib/db';
import { RESUME_PLANS } from '../src/lib/resume-plans';
import { purchasePack, fulfillOrder } from '../src/lib/payments';

async function main() {
  const user = await prisma.user.create({ data: { phone: '9000000098', name: 'Isolated plans test' } });
  const expected = [299,499,699,399,699,999,599,999,1499,699,1199,499,999];
  assert.deepEqual(RESUME_PLANS.map(p => p.priceInr), expected);
  for (const plan of RESUME_PLANS) {
    const result = await purchasePack(user.id, plan.id);
    assert.equal(result.status, 'PAID');
    assert.equal(result.amountInr, plan.priceInr);
    assert.equal(result.credits, plan.credits);
    await fulfillOrder(result.orderId, 'duplicate-callback');
    assert.equal(await prisma.creditLedger.count({ where: { orderId: result.orderId } }), 1);
  }
  const first = RESUME_PLANS[0];
  await prisma.pack.update({ where: { id: first.id }, data: { priceInr: 1, credits: 99, active: false } });
  const corrected = await purchasePack(user.id, first.id);
  assert.equal(corrected.amountInr, 299);
  assert.equal(corrected.credits, 1);
  const orders = await prisma.order.count();
  await assert.rejects(purchasePack(user.id, 'unknown-plan'), /Plan not found/);
  assert.equal(await prisma.order.count(), orders);
  console.log('PASS: all 13 prices and credits, duplicate fulfillment, canonical pricing and unknown-plan rejection');
}
main().finally(() => prisma.$disconnect()).catch(error => { console.error(error); process.exitCode = 1; });
