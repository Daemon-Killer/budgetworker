import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL?.includes('127.0.0.1:55432')) throw Error('Interview fixtures require the isolated local database');
const db = new PrismaClient();
const base = process.env.TEST_BASE_URL;
let checks = 0;
async function api(path, { token, method = 'GET', body, status = 200, origin } = {}) {
  const r = await fetch(base + '/api/' + path, { method, headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(origin ? { Origin: origin } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const d = await r.json(); assert.equal(r.status, status, path + ' ' + JSON.stringify(d)); checks++;
  if (path.startsWith('interviews') || path.startsWith('admin/interviews')) {
    assert.ok(r.headers.get('cache-control')?.includes('no-store')); assert.equal(r.headers.get('referrer-policy'), 'no-referrer'); checks++;
  }
  return d;
}
async function login(phone) {
  await api('mobile/auth/request', { method: 'POST', body: { phone } });
  return (await api('mobile/auth/verify', { method: 'POST', body: { phone, code: '123456' } })).token;
}
const future = minutes => new Date(Date.now() + minutes * 60_000).toISOString();
const privateKeys = ['workerPhone', 'familyPhone', 'phone', 'inviteHash', 'inviteExpiresAt', 'roomName', 'roomUrl', 'token', 'userId', 'internalNotes'];
function noPrivateData(view) { for (const key of privateKeys) assert.equal(view[key], undefined, 'Private ' + key); checks++; }
async function fixture(path, body) { return (await fetch(process.env.TEST_LIVEKIT_URL + path, { method: body ? 'POST' : 'GET', ...(body ? { body: JSON.stringify(body) } : {}) })).json(); }

try {
  const admin = await login('9999999999');
  let family = await login('9888888801');
  const stranger = await login('9888888802');
  const workerBody = { name: 'Interview fixture worker', phone: '9000000091', category: 'COOK', employmentType: 'PART_TIME', city: 'Pune', area: 'Baner', status: 'AVAILABLE', expectedPayInr: 8000, payPeriod: 'MONTH', hoursPerDay: 2 };
  const worker = (await api('mobile/admin/workers', { token: admin, method: 'POST', body: workerBody, status: 201 })).worker;
  const packs = (await api('packs')).packs;
  await api('orders/purchase', { token: family, method: 'POST', body: { packId: packs.find(p => p.credits === 2).id } });
  async function upload(reviewed) {
    const form = new FormData(); form.append('file', new Blob(['%PDF-1.4\nSynthetic contact-free resume'], { type: 'application/pdf' }), 'private-9000000091.pdf');
    if (reviewed) form.append('contactReviewed', 'true');
    const r = await fetch(base + '/api/mobile/admin/workers/' + worker.id + '/resume', { method: 'POST', headers: { Authorization: 'Bearer ' + admin }, body: form });
    assert.equal(r.status, reviewed ? 200 : 400); checks++;
  }
  await upload(false); await upload(true);
  const beforeBalance = (await api('auth/me', { token: family })).balance;
  await db.worker.update({ where: { id: worker.id }, data: { resumeContactReviewed: false } });
  await api('workers/' + worker.id + '/unlock', { token: family, method: 'POST', status: 409 });
  assert.equal((await api('auth/me', { token: family })).balance, beforeBalance); checks++;
  assert.equal((await api('workers/' + worker.id, { token: family })).worker.hasResume, false); checks++;
  await upload(true);
  const request = { workerId: worker.id, proposedSlots: [future(8), future(70)], duties: 'Prepare breakfast and lunch for four people.', schedule: 'Monday to Saturday, 8 to 10 am', meetingArea: 'Baner, Pune', expectedPayInr: 8000 };
  await api('interviews', { status: 401 });
  await api('interviews', { method: 'POST', body: request, status: 401 });
  await api('admin/interviews', { token: family, status: 403 });
  await api('interviews', { token: admin, method: 'POST', body: request, status: 403 });
  assert.equal((await api('interviews/eligibility?workerId=' + worker.id, { token: family })).unlocked, false); checks++;
  await api('interviews', { token: family, method: 'POST', body: request, status: 402 });
  await api('workers/' + worker.id + '/unlock', { token: family, method: 'POST' });
  const resume = await fetch(base + '/api/workers/' + worker.id + '/resume', { headers: { Authorization: 'Bearer ' + family } });
  assert.equal(resume.status, 200); assert.equal(resume.headers.get('content-disposition'), 'attachment; filename="budget-worker-resume.pdf"'); checks++;
  await db.worker.update({ where: { id: worker.id }, data: { resumeContactReviewed: false } });
  await api('workers/' + worker.id + '/resume', { token: family, status: 409 });
  await upload(true);
  const savedBalance = (await api('auth/me', { token: family })).balance;
  await api('interviews', { token: family, method: 'POST', body: { ...request, expectedPayInr: -1 }, status: 400 });
  await api('interviews', { token: family, method: 'POST', body: { ...request, proposedSlots: [future(-5)] }, status: 400 });
  await api('interviews', { token: family, method: 'POST', body: { ...request, proposedSlots: [request.proposedSlots[0], request.proposedSlots[0]] }, status: 400 });
  await api('interviews', { token: family, method: 'POST', body: { ...request, proposedSlots: [future(31 * 24 * 60)] }, status: 400 });
  await api('interviews', { token: family, method: 'POST', body: { ...request, workerPhone: 'not allowed' }, status: 400 });
  const duplicates = await Promise.all([1, 2].map(() => api('interviews', { token: family, method: 'POST', body: request })));
  let interview = duplicates[0].interview;
  assert.equal(duplicates[1].interview.id, interview.id); assert.equal(await db.interview.count({ where: { unlockId: (await db.unlock.findUnique({ where: { userId_workerId: { userId: (await db.user.findUnique({ where: { phone: '9888888801' } })).id, workerId: worker.id } } })).id } }), 1); checks++;
  noPrivateData(interview);
  assert.equal((await api('auth/me', { token: family })).balance, savedBalance); checks++;
  assert.equal((await api('interviews', { token: stranger })).interviews.length, 0); checks++;
  await api('interviews', { token: family, origin: 'https://untrusted.example', status: 403 });
  await api('interviews/' + interview.id, { token: stranger, method: 'PATCH', body: { action: 'CANCEL', version: interview.version }, status: 404 });
  await api('interviews/' + interview.id + '/join', { token: stranger, method: 'POST', status: 404 });
  await api('interviews/' + interview.id + '/browser-ticket', { token: stranger, method: 'POST', status: 404 });
  async function schedule(at = future(8)) {
    const result = await api('admin/interviews/' + interview.id, { token: admin, method: 'PATCH', body: { action: 'CONFIRM', version: interview.version, scheduledAt: at } });
    interview = result.interview;
    return { url: result.workerInviteUrl, token: new URL(result.workerInviteUrl).pathname.split('/').pop() };
  }
  let invitation = await schedule(future(120));
  assert.equal(interview.status, 'SCHEDULED'); checks++;
  assert.equal(new URL(invitation.url).origin, base); checks++;
  const stored = await db.interview.findUnique({ where: { id: interview.id } });
  assert.equal(stored.inviteHash, createHash('sha256').update(invitation.token).digest('hex')); assert.notEqual(stored.inviteHash, invitation.token); checks++;
  noPrivateData((await api('interviews/invite/' + invitation.token)).interview);
  await api('interviews/' + interview.id + '/join', { token: family, method: 'POST', status: 409 });
  await api('interviews/invite/' + invitation.token, { method: 'POST', body: { action: 'JOIN' }, status: 409 });
  const accept = await api('interviews/invite/' + invitation.token, { method: 'POST', body: { action: 'ACCEPT' } }); interview = accept.interview;
  await api('interviews/invite/' + invitation.token, { method: 'POST', body: { action: 'ACCEPT' } });
  await api('interviews/' + interview.id + '/join', { token: family, method: 'POST', status: 409 });
  const oldInvitation = invitation;
  invitation = await schedule();
  await api('interviews/invite/' + oldInvitation.token, { status: 404 });
  await api('admin/interviews/' + interview.id, { token: admin, method: 'PATCH', body: { action: 'CANCEL', version: interview.version - 1 }, status: 409 });
  interview = (await api('interviews/invite/' + invitation.token, { method: 'POST', body: { action: 'ACCEPT' } })).interview;
  const handoff = await api('interviews/' + interview.id + '/browser-ticket', { token: family, method: 'POST' });
  const accepted = await fetch(handoff.url, { redirect: 'manual' });
  assert.equal(accepted.status, 303); assert.ok(accepted.headers.get('set-cookie')?.includes('hh_session=')); assert.ok(accepted.headers.get('location')?.endsWith('/interviews/' + interview.id)); checks++;
  const replay = await fetch(handoff.url, { redirect: 'manual' }); assert.equal(replay.status, 401); checks++;
  const revoked = await api('interviews/' + interview.id + '/browser-ticket', { token: family, method: 'POST' });
  await db.user.update({ where: { phone: '9888888801' }, data: { sessionVersion: { increment: 1 } } });
  assert.equal((await fetch(revoked.url, { redirect: 'manual' })).status, 401); checks++;
  family = await login('9888888801');
  // Both sides must be protected against overlapping interviews.
  const familyUser = await db.user.findUniqueOrThrow({ where: { phone: '9888888801' } });
  const strangerUser = await db.user.findUniqueOrThrow({ where: { phone: '9888888802' } });
  await db.unlock.create({ data: { userId: strangerUser.id, workerId: worker.id } });
  const workerConflict = (await api('interviews', { token: stranger, method: 'POST', body: { ...request, proposedSlots: [future(8)] } })).interview;
  await api('admin/interviews/' + workerConflict.id, { token: admin, method: 'PATCH', body: { action: 'CONFIRM', version: workerConflict.version, scheduledAt: future(8) }, status: 409 });
  const secondWorker = await db.worker.create({ data: { ...workerBody, phone: '9000000092', name: 'Second fixture worker' } });
  await db.unlock.create({ data: { userId: familyUser.id, workerId: secondWorker.id } });
  let secondInterview = (await api('interviews', { token: family, method: 'POST', body: { ...request, workerId: secondWorker.id, proposedSlots: [future(80)] } })).interview;
  await api('admin/interviews/' + secondInterview.id, { token: admin, method: 'PATCH', body: { action: 'CONFIRM', version: secondInterview.version, scheduledAt: future(8) }, status: 409 });
  const secondSchedule = await api('admin/interviews/' + secondInterview.id, { token: admin, method: 'PATCH', body: { action: 'CONFIRM', version: secondInterview.version, scheduledAt: future(80) } });
  secondInterview = secondSchedule.interview;
  const expiredInvite = new URL(secondSchedule.workerInviteUrl).pathname.split('/').pop();
  await db.interview.update({ where: { id: secondInterview.id }, data: { scheduledAt: new Date(Date.now() - 31 * 60_000), inviteExpiresAt: new Date(Date.now() - 60_000) } });
  await api('interviews/invite/' + expiredInvite, { status: 404 });
  secondInterview = (await api('admin/interviews/' + secondInterview.id, { token: admin, method: 'PATCH', body: { action: 'NO_SHOW', version: secondInterview.version } })).interview;
  assert.equal(secondInterview.status, 'NO_SHOW'); checks++;
  secondInterview = (await api('admin/interviews/' + secondInterview.id, { token: admin, method: 'PATCH', body: { action: 'RETRY', version: secondInterview.version } })).interview;
  assert.equal(secondInterview.status, 'REQUESTED'); checks++;
  await db.worker.update({ where: { id: secondWorker.id }, data: { status: 'INACTIVE' } });
  await api('admin/interviews/' + secondInterview.id, { token: admin, method: 'PATCH', body: { action: 'CONFIRM', version: secondInterview.version, scheduledAt: future(80) }, status: 409 });
  await api('interviews/' + secondInterview.id, { token: family, method: 'PATCH', body: { action: 'RESCHEDULE', version: secondInterview.version, proposedSlots: [future(80)] }, status: 409 });
  await fixture('/__fixture/fail', { path: '/twirp/livekit.RoomService/CreateRoom' });
  await api('interviews/' + interview.id + '/join', { token: family, method: 'POST', status: 503 });
  assert.equal((await db.interview.findUnique({ where: { id: interview.id } })).familyJoinedAt, null); checks++;
  await fixture('/__fixture/fail', { path: '' });
  const familyCall = await api('interviews/' + interview.id + '/join', { token: family, method: 'POST' });
  const workerCall = await api('interviews/invite/' + invitation.token, { method: 'POST', body: { action: 'JOIN' } });
  assert.equal(familyCall.serverUrl, workerCall.serverUrl); assert.equal(familyCall.roomName, workerCall.roomName); assert.notEqual(familyCall.token, workerCall.token); assert.equal(new URL(familyCall.serverUrl).search, ''); checks++;
  const provider = await fixture('/__fixture/requests');
  const createdRoom = provider.find(r => r.pathname === '/twirp/livekit.RoomService/CreateRoom').body;
  assert.equal(createdRoom.maxParticipants, 2); assert.equal(createdRoom.emptyTimeout, 60); assert.equal(JSON.parse(createdRoom.metadata).endsAt, familyCall.endsAt); checks++;
  const { TokenVerifier } = await import('livekit-server-sdk');
  const verifier = new TokenVerifier(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET);
  for (const call of [familyCall, workerCall]) {
    const claims = await verifier.verify(call.token, 0);
    assert.equal(claims.video.roomJoin, true); assert.equal(claims.video.room, createdRoom.name); assert.ok(!claims.video.roomAdmin); assert.ok(!claims.video.roomRecord); assert.equal(claims.video.canPublishData, false); assert.deepEqual(claims.video.canPublishSources, ['camera', 'microphone']); assert.ok(claims.exp > Date.now() / 1000 && claims.exp <= Date.now() / 1000 + 121); assert.ok(!/\d{10}|@/.test(claims.name)); checks++;
    const access = await api('interviews/call-access', { token: process.env.LIVEKIT_GUARD_SECRET, method: 'POST', body: { roomName: call.roomName, identity: claims.sub } });
    assert.equal(access.allowed, true); assert.equal(access.endsAt, call.endsAt); checks++;
  }
  await api('interviews/call-access', { token: family, method: 'POST', body: { roomName: familyCall.roomName }, status: 401 });
  assert.equal((await api('interviews/call-access', { token: process.env.LIVEKIT_GUARD_SECRET, method: 'POST', body: { roomName: familyCall.roomName, identity: 'stranger' } })).allowed, false); checks++;
  await api('admin/interviews/' + interview.id, { token: admin, method: 'PATCH', body: { action: 'NO_SHOW', version: interview.version }, status: 409 });
  const mobileCancelTicket = await api('interviews/' + interview.id + '/browser-ticket', { token: family, method: 'POST' });
  await fixture('/__fixture/fail', { path: '/bw/revoke' });
  await api('interviews/' + interview.id, { token: family, method: 'PATCH', body: { action: 'CANCEL', version: interview.version }, status: 503 });
  assert.equal((await db.interview.findUnique({ where: { id: interview.id } })).status, 'CONFIRMED'); checks++;
  await fixture('/__fixture/fail', { path: '' });
  interview = (await api('interviews/' + interview.id, { token: family, method: 'PATCH', body: { action: 'CANCEL', version: interview.version } })).interview;
  await api('interviews/invite/' + invitation.token, { status: 404 });
  await api('interviews/' + interview.id + '/join', { token: family, method: 'POST', status: 409 });
  assert.equal((await fetch(mobileCancelTicket.url, { redirect: 'manual' })).status, 401); checks++;
  const closed = await fixture('/__fixture/requests');
  assert.ok(closed.some(r => r.pathname === '/bw/revoke' && r.body.roomName === createdRoom.name)); checks++;
  assert.equal((await api('interviews/call-access', { token: process.env.LIVEKIT_GUARD_SECRET, method: 'POST', body: { roomName: familyCall.roomName } })).allowed, false); checks++;
  interview = (await api('interviews/' + interview.id, { token: family, method: 'PATCH', body: { action: 'RESCHEDULE', version: interview.version, proposedSlots: [future(8)] } })).interview;
  invitation = await schedule();
  interview = (await api('interviews/invite/' + invitation.token, { method: 'POST', body: { action: 'ACCEPT' } })).interview;
  // A worker may withdraw a previously accepted invitation; the old invite closes.
  interview = (await api('interviews/invite/' + invitation.token, { method: 'POST', body: { action: 'DECLINE' } })).interview;
  assert.equal(interview.status, 'REQUESTED'); await api('interviews/invite/' + invitation.token, { status: 404 }); checks++;
  invitation = await schedule(); interview = (await api('interviews/invite/' + invitation.token, { method: 'POST', body: { action: 'ACCEPT' } })).interview;
  await api('interviews/' + interview.id + '/join', { token: family, method: 'POST' });
  await api('interviews/invite/' + invitation.token, { method: 'POST', body: { action: 'JOIN' } });
  await db.interview.update({ where: { id: interview.id }, data: { scheduledAt: new Date(Date.now() - 60_000) } });
  interview = (await api('admin/interviews/' + interview.id, { token: admin, method: 'PATCH', body: { action: 'COMPLETE', version: interview.version } })).interview;
  assert.equal(interview.status, 'COMPLETED'); checks++;
  await api('admin/interviews/' + interview.id, { token: admin, method: 'PATCH', body: { action: 'RETRY', version: interview.version }, status: 409 });
  await api('interviews/' + interview.id, { token: family, method: 'PATCH', body: { action: 'RESCHEDULE', version: interview.version, proposedSlots: [future(60)] }, status: 409 });
  const repeated = await api('interviews', { token: family, method: 'POST', body: request }); assert.equal(repeated.interview.id, interview.id); assert.equal(repeated.interview.status, 'COMPLETED'); checks++;
  interview = (await api('interviews/' + interview.id, { token: family, method: 'PATCH', body: { action: 'OUTCOME', version: interview.version, outcome: 'INTERESTED' } })).interview;
  assert.equal(interview.outcome, 'INTERESTED'); assert.equal((await api('auth/me', { token: family })).balance, savedBalance); checks++;
  noPrivateData((await api('interviews', { token: family })).interviews.find(row => row.id === interview.id));
  await api('interviews/invite/' + invitation.token, { status: 404 });
  console.log('PASS: ' + checks + ' interview assertions covering unlock entitlement, idempotency, contact review, role/ownership checks, worker consent, private provider payloads, failures, revocation, mobile handoff and completion.');
} finally { await db.$disconnect(); }
