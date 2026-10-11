import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prisma } from '../src/lib/db';
import { submitWorkerLead } from '../src/lib/worker-leads';

if (!process.env.DATABASE_URL?.startsWith('postgresql://postgres:postgres@127.0.0.1:')) throw Error('Worker lead tests require the isolated database');
async function main() {
  const registration = { requestId: randomUUID(), kind: 'REGISTER', name: 'Fixture Worker', phone: '+91 90000 00011', alternatePhone: '+91 90000 00015', age: 30, gender: 'Female', city: 'Pune', area: 'Baner', workTypes: ['Domestic Help','Babycare'], arrangements: ['Part-time'], experience: 5, languages: ['Hindi'], dailyHours: 8, monthlySalary: 15000, availability: 'Immediately', notes: 'Test data', referrerName: '', referrerPhone: '', relationship: '', consent: true, website: '' };
  const result = await submitWorkerLead(registration); assert.equal(result.status,'RECEIVED');
  const stored = await prisma.workerLead.findUniqueOrThrow({ where: { id: result.reference } });
  assert.equal(stored.phone,'9000000011'); assert.equal(stored.status,'NEW'); assert.equal((stored.details as {alternatePhone:string}).alternatePhone,'9000000015');
  assert.equal((await submitWorkerLead(registration)).reference,result.reference);
  await assert.rejects(submitWorkerLead({ ...registration, name: 'Different worker' }), { status: 409 });
  for (const changes of [{ alternatePhone: '123' }, { alternatePhone: '9000000011' }, { phone: '123' }, { consent: false }, { workTypes: [] }, { arrangements: [] }, { languages: [] }, { age: 15 }, { website: 'spam' }]) await assert.rejects(submitWorkerLead({ ...registration, requestId: randomUUID(), ...changes }), { status: 400 });
  const referral = { ...registration, requestId: randomUUID(), kind: 'REFER', alternatePhone: undefined, phone: '9000000012', referrerName: 'Fixture Referrer', referrerPhone: '+91 9000000013', relationship: 'Friend', arrangements: ['24-hour Live-in'] };
  const referred = await submitWorkerLead(referral);
  const row = await prisma.workerLead.findUniqueOrThrow({ where: { id: referred.reference } });
  assert.equal((row.details as {referrerPhone:string}).referrerPhone,'9000000013');
  await assert.rejects(submitWorkerLead({ ...referral, requestId: randomUUID(), referrerPhone: '' }), { status: 400 });
  const concurrent = { ...registration, requestId: randomUUID(), phone: '9000000014', alternatePhone: '' };
  const repeated = await Promise.all([submitWorkerLead(concurrent),submitWorkerLead(concurrent)]); assert.equal(repeated[0].reference,repeated[1].reference);
  for (let i=0;i<4;i++) await submitWorkerLead({ ...registration, requestId: randomUUID() });
  await assert.rejects(submitWorkerLead({ ...registration, requestId: randomUUID() }), { status: 429 });
  assert.equal(await prisma.worker.count(),0);
  assert.equal(await prisma.user.count(),0);
  console.log('PASS: registration/referral persistence, phone normalization, consent and field validation, retry idempotency, concurrent requests, throttling and no automatic public worker/account creation');
}
main().finally(()=>prisma.$disconnect()).catch(error=>{console.error(error);process.exitCode=1});
