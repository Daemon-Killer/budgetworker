import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
const base = process.env.TEST_BASE_URL + '/api/';
const db = new PrismaClient();
let checks = 0;
async function api(path, { token, method = 'GET', body, status = 200 } = {}) {
  const res = await fetch(base + path, { method, headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await res.json(); assert.equal(res.status, status, path + ': ' + JSON.stringify(data)); checks++; return data;
}
async function login(phone) {
  await api('mobile/auth/request', { method: 'POST', body: { phone } });
  return (await api('mobile/auth/verify', { method: 'POST', body: { phone, code: '123456' } })).token;
}
const input = { name: 'Worker registration test', category: 'HOUSEKEEPING', employmentType: 'PART_TIME', city: 'Pune', area: 'Baner', about: 'Experienced domestic helper', skill: 'Cleaning and laundry', whenCanJoin: 'Immediately', experienceYears: 5, expectedPayInr: 8000, hoursPerDay: 4, payPeriod: 'MONTH', status: 'AVAILABLE' };
try {
  await api('worker-account', { status: 401 });
  await api('worker-account', { method: 'PUT', body: input, status: 401 });
  const worker = await login('9876543211');
  const second = await login('9876543212');
  const admin = await login('9999999999');
  const account = await api('worker-account', { token: worker });
  assert.equal(account.profile.name, 'Meera Patil');
  for (const key of ['internalNotes', 'resumeData', 'policeVerified', 'aadhaarVerified', 'userId']) assert.equal(account.profile[key], undefined);
  const newAccount = await api('worker-account', { token: second }); assert.equal(newAccount.profile, null);
  await api('worker-account', { token: second, method: 'PUT', body: { ...input, userId: 'some-other-account' }, status: 400 });
  await api('worker-account', { token: second, method: 'PUT', body: { ...input, onboardingStatus: 'APPROVED' }, status: 400 });
  await api('worker-account', { token: second, method: 'PUT', body: { ...input, policeVerified: true }, status: 400 });
  await api('worker-account', { token: second, method: 'PUT', body: { ...input, expectedPayInr: -1 }, status: 400 });
  await api('worker-account', { token: second, method: 'PUT', body: { ...input, category: 'COOK' }, status: 400 });
  await api('worker-account', { token: admin, method: 'PUT', body: input, status: 403 });
  const registered = (await api('worker-account', { token: second, method: 'PUT', body: input })).profile;
  assert.equal(registered.onboardingStatus, 'PENDING'); assert.equal(registered.phone, '9876543212');
  const directory = await api('workers?q=Worker%20registration%20test'); assert.equal(directory.total, 0);
  assert.equal((await api('worker-account', { token: worker })).profile.id, account.profile.id);
  await api('worker-account', { token: admin, method: 'PUT', body: { ...input, status: 'PLACED' }, status: 403 });
  await api('admin/workers/' + registered.id, { token: admin, method: 'PATCH', body: { status: 'AVAILABLE' } });
  const approved = (await api('worker-account', { token: second })).profile; assert.equal(approved.onboardingStatus, 'APPROVED');
  const paused = (await api('worker-account', { token: second, method: 'PUT', body: { ...input, status: 'INACTIVE' } })).profile;
  assert.equal(paused.status, 'INACTIVE'); assert.equal(paused.onboardingStatus, 'APPROVED');
  await db.worker.update({ where: { id: registered.id }, data: { status: 'PLACED' } });
  await api('worker-account', { token: second, method: 'PUT', body: input, status: 409 });
  const family = await db.user.findUniqueOrThrow({ where: { phone: '9876543210' } });
  const unlock = await db.unlock.create({ data: { userId: family.id, workerId: account.profile.id } });
  const invitation = await db.interview.create({ data: { userId: family.id, workerId: account.profile.id, unlockId: unlock.id, proposedSlots: [new Date(Date.now() + 86400000).toISOString()], duties: 'Help with meals and cleaning', schedule: 'Morning', meetingArea: 'Baner' } });
  const invited = await api('worker-account', { token: worker });
  assert.equal(invited.invitations[0].id, invitation.id); assert.equal(invited.invitations[0].familyName, 'Aarav');
  for (const key of ['phone', 'userId', 'workerId', 'inviteHash', 'roomUrl', 'user']) assert.equal(invited.invitations[0][key], undefined);
  assert.equal((await api('worker-account', { token: second })).invitations.length, 0);
  const duplicateUser = await db.user.create({ data: { phone: '9000000010' } });
  await db.worker.create({ data: { name: 'Unlinked legacy profile', phone: duplicateUser.phone, category: 'HOUSEKEEPING' } });
  const duplicate = await login(duplicateUser.phone);
  await api('worker-account', { token: duplicate, method: 'PUT', body: input, status: 409 });
  // Saathi documents are private, bounded, and cannot self-approve identity.
  const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aKqkAAAAASUVORK5CYII=', 'base64');
  async function upload(token, kind, body, expected) {
    const res = await fetch(base + 'worker-account/documents?kind=' + kind, { method: 'PUT', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'image/png' }, body });
    assert.equal(res.status, expected); checks++; return res.json();
  }
  await upload(second, 'OTHER', image, 400);
  await upload(second, 'PHOTO', Buffer.from('not an image'), 400);
  await upload(second, 'PHOTO', Buffer.alloc(2 * 1024 * 1024 + 1), 413);
  const doc = (await upload(second, 'AADHAAR', image, 200)).document;
  assert.equal(doc.status, 'PENDING'); assert.equal(doc.data, undefined);
  let download = await fetch(base + 'worker-account/documents?id=' + doc.id, { headers: { Authorization: 'Bearer ' + worker } });
  assert.equal(download.status, 404); checks++;
  download = await fetch(base + 'worker-account/documents?id=' + doc.id); assert.equal(download.status, 401); checks++;
  for (const token of [second, admin]) {
    download = await fetch(base + 'worker-account/documents?id=' + doc.id, { headers: { Authorization: 'Bearer ' + token } });
    assert.equal(download.status, 200); assert.equal(download.headers.get('cache-control'), 'private, no-store'); assert.deepEqual(Buffer.from(await download.arrayBuffer()), image); checks++;
  }
  await db.worker.update({ where: { id: registered.id }, data: { aadhaarVerified: true } });
  await upload(second, 'AADHAAR', image, 200);
  assert.equal((await api('worker-account', { token: second })).verification.aadhaarVerified, false);
  await api('worker-account/support', { token: second, method: 'POST', body: { topic: 'SALARY', message: 'Please help with my pending salary.' }, status: 201 });
  const support = await api('worker-account', { token: second }); assert.equal(support.supportRequests.length, 1); assert.equal(support.documents.length, 1);
  const isolated = await api('worker-account', { token: worker }); assert.equal(isolated.supportRequests.length, 0); assert.equal(isolated.documents.length, 0);
  await api('worker-account/support', { token: second, method: 'POST', body: { topic: 'UNKNOWN', message: 'Invalid topic' }, status: 400 });
  await api('worker-account/support', { method: 'POST', body: { topic: 'OTHER', message: 'Unauthenticated' }, status: 401 });
  console.log(`PASS: ${checks} worker API checks; registration, approval, account isolation, private fields, availability, invitations, and duplicate protection.`);
} finally { await db.$disconnect(); }
