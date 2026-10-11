import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { AccessToken, RoomServiceClient, TrackSource } from 'livekit-server-sdk';
import { createGateway } from '../infra/livekit/gateway/server.mjs';

if (!process.env.LIVEKIT_SMOKE_BINARY) throw new Error('Set LIVEKIT_SMOKE_BINARY to the official local server binary');
const dir = await mkdtemp(path.join(os.tmpdir(), 'bw-livekit-smoke-'));
const key = 'smoke-key', secret = 'synthetic-smoke-api-secret-at-least-32-characters', guard = 'synthetic-smoke-guard-secret-at-least-32-characters';
const configFile = path.join(dir, 'livekit.yaml');
const probe = http.createServer(); await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
await writeFile(configFile, `port: ${port}\nbind_addresses: ["127.0.0.1"]\nlog_level: error\nrtc:\n  node_ip: 127.0.0.1\n  use_external_ip: false\n  udp_port: 17882\n  tcp_port: 17881\nkeys:\n  ${key}: ${secret}\n`);
const media = spawn(process.env.LIVEKIT_SMOKE_BINARY, ['--config', configFile], { stdio: ['ignore', 'pipe', 'pipe'] });
let log = ''; media.stdout.on('data', data => { log += data; }); media.stderr.on('data', data => { log += data; });
let allowed = true;
const app = http.createServer(async (req, res) => {
  let raw = ''; for await (const part of req) raw += part;
  const input = JSON.parse(raw);
  res.setHeader('Content-Type', 'application/json');
  if (req.headers.authorization !== 'Bearer ' + guard) { res.writeHead(401); return res.end('{}'); }
  res.end(JSON.stringify({ allowed: allowed && input.roomName === 'bw-smoke' && (!input.identity || input.identity === 'family-smoke'), identities: ['family-smoke'], endsAt: new Date(Date.now() + 60000).toISOString() }));
});
await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
const internalUrl = 'http://127.0.0.1:' + port;
const service = new RoomServiceClient(internalUrl, key, secret, { requestTimeout: 2 });
let gateway;
try {
  let ready = false;
  for (let n = 0; n < 50; n++) { try { await service.listRooms(); ready = true; break; } catch { await new Promise(resolve => setTimeout(resolve, 100)); } }
  assert.ok(ready, 'Real server failed to start: ' + log);
  const room = await service.createRoom({ name: 'bw-smoke', maxParticipants: 2, emptyTimeout: 60 });
  assert.equal(room.maxParticipants, 2);
  gateway = await createGateway({ livekitInternalUrl: internalUrl, appUrl: 'http://127.0.0.1:' + app.address().port, allowLocalApp: true, apiKey: key, apiSecret: secret, guardSecret: guard, stateFile: path.join(dir, 'state.json'), sweepMs: 100000 });
  await new Promise(resolve => gateway.server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + gateway.server.address().port;
  const token = new AccessToken(key, secret, { identity: 'family-smoke', ttl: 120 });
  token.addGrant({ room: 'bw-smoke', roomJoin: true, canPublishSources: [TrackSource.CAMERA, TrackSource.MICROPHONE], canPublishData: false });
  const jwt = await token.toJwt();
  const params = new URLSearchParams({ access_token: jwt, protocol: '15', sdk: 'js', version: '2.22.4', auto_subscribe: '1' });
  assert.equal((await fetch(url + '/rtc/validate?' + params)).status, 200);
  const socket = await new Promise((resolve, reject) => {
    const request = http.request(url + '/rtc?' + params, { headers: { Upgrade: 'websocket', Connection: 'Upgrade', 'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==' } });
    request.on('upgrade', (_response, socket) => { socket.on('error', () => {}); socket.resume(); resolve(socket); });
    request.on('response', response => reject(new Error('Real signaling rejected: ' + response.statusCode))); request.on('error', reject); request.end();
  });
  const closed = new Promise(resolve => socket.once('close', resolve));
  const participants = await service.listParticipants('bw-smoke');
  assert.equal(participants.length, 1); assert.equal(participants[0].identity, 'family-smoke');
  const response = await fetch(url + '/bw/revoke', { method: 'POST', headers: { Authorization: 'Bearer ' + guard, 'Content-Type': 'application/json' }, body: JSON.stringify({ roomName: 'bw-smoke' }) });
  assert.equal(response.status, 200); await closed;
  assert.equal((await service.listRooms(['bw-smoke'])).length, 0);
  assert.equal((await fetch(url + '/rtc/validate?' + params)).status, 503);
  allowed = false;
  console.log('PASS: actual LiveKit v1.13.9 room API, two-participant configuration, gateway WebSocket admission, participant identity, room termination and cached-token replay denial. No microphone or camera was used.');
} finally {
  await gateway?.close(); await new Promise(resolve => app.close(resolve));
  const stopped = new Promise(resolve => media.once('exit', resolve)); media.kill(); await stopped;
  await rm(dir, { recursive: true, force: true });
}
