import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { AccessToken, TrackSource } from 'livekit-server-sdk';
import { createGateway } from './server.mjs';

const key = 'test-key', secret = 'test-api-secret-at-least-32-characters', guard = 'test-guard-secret-at-least-32-characters';
const listen = async server => { await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); return 'http://127.0.0.1:' + server.address().port; };
test('admission, revocation persistence, websocket closure, deadlines and outages', async () => {
  const state = await mkdtemp(path.join(os.tmpdir(), 'bw-call-test-'));
  const rooms = new Set(); let allowed = true, outage = false, endsAt = new Date(Date.now() + 60000).toISOString(), deleted = 0;
  const media = http.createServer(async (req, res) => {
    let body = ''; for await (const part of req) body += part;
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/twirp/livekit.RoomService/ListRooms') return res.end(JSON.stringify({ rooms: [...rooms].map(name => ({ name, sid: 'RM_test' })) }));
    if (req.url === '/twirp/livekit.RoomService/DeleteRoom') { rooms.delete(JSON.parse(body).room); deleted++; return res.end('{}'); }
    if (req.url.startsWith('/rtc/validate')) return res.end('{"accepted":true}');
    res.writeHead(404); res.end('{}');
  });
  const openSockets = new Set();
  media.on('upgrade', (req, socket) => {
    openSockets.add(socket); socket.once('close', () => openSockets.delete(socket)); socket.on('error', () => {});
    const accept = createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  });
  const app = http.createServer(async (req, res) => {
    let body = ''; for await (const part of req) body += part;
    const input = JSON.parse(body);
    if (req.headers.authorization !== 'Bearer ' + guard) { res.writeHead(401); return res.end('{}'); }
    res.setHeader('Content-Type', 'application/json');
    if (outage) { res.writeHead(503); return res.end('{}'); }
    res.end(JSON.stringify({ allowed: allowed && (!input.identity || input.identity === 'family-test'), identities: ['family-test'], endsAt }));
  });
  const config = { livekitInternalUrl: await listen(media), appUrl: await listen(app), allowLocalApp: true, apiKey: key, apiSecret: secret, guardSecret: guard, stateFile: path.join(state, 'revocations.json'), sweepMs: 100000 };
  let gateway = await createGateway(config), url = await listen(gateway.server);
  async function token(name, identity = 'family-test', options = {}) {
    const jwt = new AccessToken(key, secret, { identity, ttl: options.ttl || 120 });
    jwt.addGrant({ room: name, roomJoin: true, canPublishSources: [TrackSource.CAMERA, TrackSource.MICROPHONE], canPublishData: false, ...options.grants });
    return jwt.toJwt();
  }
  const validate = jwt => fetch(url + '/rtc/validate?access_token=' + encodeURIComponent(jwt));
  try {
    const jwt = await token('bw-first');
    assert.equal((await validate(jwt)).status, 200);
    assert.equal((await validate(jwt + 'forged')).status, 503);
    assert.equal((await validate(await token('bw-first', 'worker-stranger'))).status, 503);
    assert.equal((await validate(await token('bw-first', 'family-test', { ttl: -1 }))).status, 503);
    assert.equal((await validate(await token('bw-first', 'family-test', { grants: { roomAdmin: true } }))).status, 503);
    assert.equal((await fetch(url + '/twirp/livekit.RoomService/ListRooms', { method: 'POST', headers: { Authorization: 'Bearer ' + jwt }, body: '{}' })).status, 403);
    assert.equal((await fetch(url + '/rtc', { method: 'POST' })).status, 404);
    const socket = await new Promise((resolve, reject) => {
      const request = http.request(url + '/rtc?access_token=' + encodeURIComponent(jwt), { headers: { Upgrade: 'websocket', Connection: 'Upgrade', 'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==' } });
      request.on('upgrade', (_response, socket) => { socket.on('error', () => {}); resolve(socket); }); request.on('error', reject); request.on('response', () => reject(new Error('Upgrade rejected'))); request.end();
    });
    const closed = new Promise(resolve => socket.once('close', resolve));
    assert.equal((await fetch(url + '/bw/revoke', { method: 'POST', headers: { Authorization: 'Bearer wrong' }, body: '{"roomName":"bw-first"}' })).status, 401);
    assert.equal((await fetch(url + '/bw/revoke', { method: 'POST', headers: { Authorization: 'Bearer ' + guard }, body: '{"roomName":"bw-first"}' })).status, 200);
    await closed;
    assert.equal((await validate(jwt)).status, 503);
    assert.deepEqual(JSON.parse(await readFile(config.stateFile, 'utf8')), ['bw-first']);
    await gateway.close(); gateway = await createGateway(config); url = await listen(gateway.server);
    assert.equal((await validate(jwt)).status, 503, 'replay stays blocked after restart');
    allowed = false; assert.equal((await validate(await token('bw-denied'))).status, 503); allowed = true;
    endsAt = new Date(Date.now() + 100).toISOString(); rooms.add('bw-deadline');
    assert.equal((await validate(await token('bw-deadline'))).status, 200);
    await new Promise(resolve => setTimeout(resolve, 180));
    assert.ok(!rooms.has('bw-deadline')); assert.equal((await validate(await token('bw-deadline'))).status, 503);
    endsAt = new Date(Date.now() + 60000).toISOString(); rooms.add('bw-outage'); outage = true;
    await gateway.sweep(); assert.ok(!rooms.has('bw-outage')); assert.equal((await fetch(url + '/healthz')).status, 503);
    assert.equal((await validate(await token('bw-outage'))).status, 503);
    outage = false; await gateway.sweep(); assert.equal((await fetch(url + '/healthz')).status, 200);
    assert.ok(deleted >= 3);
  } finally {
    await gateway.close(); for (const socket of openSockets) socket.destroy();
    await Promise.all([new Promise(resolve => media.close(resolve)), new Promise(resolve => app.close(resolve))]);
    await rm(state, { recursive: true, force: true });
  }
});
