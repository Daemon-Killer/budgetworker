import http from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RoomServiceClient, TokenVerifier } from 'livekit-server-sdk';

const roomPattern = /^bw-[A-Za-z0-9_-]{1,150}$/;
const hash = value => createHash('sha256').update(value).digest();
export async function createGateway(config) {
  const local = new URL(config.livekitInternalUrl);
  const app = new URL(config.appUrl);
  if (local.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(local.hostname) || local.pathname !== '/') throw new Error('LiveKit must be loopback-only');
  const devApp = config.allowLocalApp && ['127.0.0.1', 'localhost'].includes(app.hostname) && app.protocol === 'http:';
  if ((!devApp && app.protocol !== 'https:') || app.username || app.password || app.search || app.hash || app.pathname !== '/') throw new Error('Invalid app origin');
  if (config.apiSecret.length < 32 || config.guardSecret.length < 32) throw new Error('Secrets must have at least 32 characters');
  const verifier = new TokenVerifier(config.apiKey, config.apiSecret);
  const service = new RoomServiceClient(local.origin, config.apiKey, config.apiSecret, { requestTimeout: 3 });
  const revoked = new Set();
  await mkdir(path.dirname(config.stateFile), { recursive: true });
  try {
    const saved = JSON.parse(await readFile(config.stateFile, 'utf8'));
    if (!Array.isArray(saved) || saved.some(name => typeof name !== 'string' || !roomPattern.test(name))) throw new Error('Invalid revocation state');
    saved.forEach(name => revoked.add(name));
  } catch (e) { if (e.code !== 'ENOENT') throw e; }
  let saving = Promise.resolve(), sweeping = false, lastSweep = 0;
  const sockets = new Map();
  const deadlines = new Map();
  const healthy = () => Date.now() - lastSweep < 15000;
  async function persist(name) {
    revoked.add(name);
    saving = saving.catch(() => {}).then(async () => {
      const temporary = config.stateFile + '.tmp';
      await writeFile(temporary, JSON.stringify([...revoked]), { mode: 0o600 });
      await rename(temporary, config.stateFile);
    });
    return saving;
  }
  function stopSockets(name) {
    for (const pair of sockets.get(name) || []) { pair.client.destroy(); pair.upstream?.destroy(); }
    sockets.delete(name);
  }
  async function closeRoom(name, permanent = false) {
    if (permanent) await persist(name);
    stopSockets(name);
    clearTimeout(deadlines.get(name)); deadlines.delete(name);
    // DeleteRoom is idempotent for the guardian. A not_found response means
    // no active participants remain; all other errors keep readiness closed.
    try { await service.deleteRoom(name); }
    catch (e) { if (e.code !== 'not_found' && e.status !== 404) throw e; }
  }
  async function policy(name, identity) {
    if (revoked.has(name)) return { allowed: false };
    const response = await fetch(app.origin + '/api/interviews/call-access', {
      method: 'POST', headers: { Authorization: 'Bearer ' + config.guardSecret, 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomName: name, ...(identity ? { identity } : {}) }), redirect: 'error', signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) throw new Error('Booking checks unavailable');
    const result = await response.json();
    if (!result.allowed) return { allowed: false };
    const end = Date.parse(result.endsAt);
    if (!Number.isFinite(end) || end <= Date.now() || end > Date.now() + 41 * 60000 || !Array.isArray(result.identities) || (identity && !result.identities.includes(identity))) return { allowed: false };
    if (!deadlines.has(name)) deadlines.set(name, setTimeout(() => { void closeRoom(name, true).catch(() => { lastSweep = 0; }); }, end - Date.now()));
    return result;
  }
  async function sweep() {
    if (sweeping) return;
    sweeping = true;
    try {
      const rooms = await service.listRooms();
      let success = true;
      for (const room of rooms.filter(room => roomPattern.test(room.name))) {
        try { if (!(await policy(room.name)).allowed) await closeRoom(room.name); }
        catch { success = false; await closeRoom(room.name).catch(() => {}); }
      }
      // A booking outage ends existing sessions and blocks new admissions.
      lastSweep = success ? Date.now() : 0;
    } catch { lastSweep = 0; for (const name of sockets.keys()) stopSockets(name); }
    finally { sweeping = false; }
  }
  async function authorize(req) {
    if (!healthy()) throw new Error('Call server unavailable');
    const url = new URL(req.url, 'http://gateway');
    const token = url.searchParams.get('access_token') || req.headers.authorization?.replace(/^Bearer /, '');
    if (!token || token.length > 12000) throw new Error('Access denied');
    const claims = await verifier.verify(token, 0);
    const grant = claims.video;
    if (!grant?.roomJoin || !roomPattern.test(grant.room || '') || !claims.sub || grant.roomAdmin || grant.roomCreate || grant.roomList || grant.roomRecord || grant.agent || grant.recorder || grant.canPublishData !== false || grant.canUpdateOwnMetadata === true) throw new Error('Access denied');
    // Refreshed LiveKit tokens use string source names in their wire JWT.
    if (!Array.isArray(grant.canPublishSources) || grant.canPublishSources.some(source => !['camera', 'microphone', 1, 2].includes(source))) throw new Error('Access denied');
    if (!(await policy(grant.room, claims.sub)).allowed || revoked.has(grant.room)) throw new Error('Access denied');
    return grant.room;
  }
  function reply(res, status, body) { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); }
  async function body(req) {
    let value = ''; for await (const chunk of req) { value += chunk; if (value.length > 16000) throw new Error('Body too large'); }
    return JSON.parse(value);
  }
  function proxy(req, res) {
    const upstream = http.request(local.origin + req.url, { method: req.method, headers: { ...req.headers, host: local.host } }, response => { res.writeHead(response.statusCode, { ...response.headers, 'Cache-Control': 'no-store' }); response.pipe(res); });
    upstream.on('error', () => { if (!res.headersSent) reply(res, 502, { error: 'Call server unavailable' }); else res.destroy(); });
    upstream.setTimeout(10000, () => upstream.destroy());
    req.pipe(upstream);
  }
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://gateway');
      if (url.pathname === '/healthz' && req.method === 'GET') return reply(res, healthy() ? 200 : 503, { ready: healthy() });
      if (url.pathname === '/bw/revoke' && req.method === 'POST') {
        const supplied = req.headers.authorization || '';
        if (supplied.length > 1000 || !timingSafeEqual(hash(supplied), hash('Bearer ' + config.guardSecret))) return reply(res, 401, { error: 'Access denied' });
        const input = await body(req);
        if (Object.keys(input).length !== 1 || !roomPattern.test(input.roomName || '')) return reply(res, 400, { error: 'Invalid room' });
        await closeRoom(input.roomName, true); return reply(res, 200, { closed: true });
      }
      if (url.pathname === '/rtc/validate' && req.method === 'GET') { await authorize(req); return proxy(req, res); }
      if (url.pathname.startsWith('/twirp/livekit.RoomService/') && req.method === 'POST') {
        // The media server validates each SDK service grant. Participant JWTs
        // are excluded here so there is no alternate admission path.
        const claims = await verifier.verify((req.headers.authorization || '').replace(/^Bearer /, ''), 0);
        const grant = claims.video;
        if (grant?.roomJoin || !(grant?.roomCreate || grant?.roomList || grant?.roomAdmin)) return reply(res, 403, { error: 'Access denied' });
        return proxy(req, res);
      }
      return reply(res, 404, { error: 'Not found' });
    } catch { return reply(res, 503, { error: 'Call access unavailable' }); }
  });
  server.on('upgrade', async (req, socket, head) => {
    const pair = { client: socket };
    // Prevent an unhandled socket error while an asynchronous policy request
    // is pending. Never log the URL: it contains a participant access token.
    socket.on('error', () => pair.upstream?.destroy());
    try {
      if (new URL(req.url, 'http://gateway').pathname !== '/rtc') throw new Error('Access denied');
      const name = await authorize(req);
      if (socket.destroyed) return;
      const group = sockets.get(name) || new Set(); group.add(pair); sockets.set(name, group);
      socket.once('close', () => { group.delete(pair); if (!group.size) sockets.delete(name); });
      if (revoked.has(name)) throw new Error('Access denied');
      const upstream = http.request(local.origin + req.url, { headers: { ...req.headers, host: local.host } });
      upstream.on('upgrade', (response, remote, initial) => {
        remote.setTimeout(0);
        pair.upstream = remote;
        if (socket.destroyed || revoked.has(name)) { remote.destroy(); socket.destroy(); return; }
        socket.write('HTTP/1.1 101 Switching Protocols\r\n' + Object.entries(response.headers).map(([key, value]) => `${key}: ${value}`).join('\r\n') + '\r\n\r\n');
        if (initial.length) socket.write(initial); if (head.length) remote.write(head);
        remote.on('error', () => socket.destroy()); remote.pipe(socket); socket.pipe(remote);
      });
      upstream.on('response', () => socket.destroy()); upstream.on('error', () => socket.destroy());
      upstream.setTimeout(5000, () => upstream.destroy()); upstream.end();
    } catch { if (!socket.destroyed) socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); }
  });
  server.requestTimeout = 10000; server.headersTimeout = 10000; server.maxHeadersCount = 40;
  await sweep();
  const timer = setInterval(() => { void sweep(); }, config.sweepMs || 5000);
  return { server, sweep, policy, close: async () => { clearInterval(timer); for (const deadline of deadlines.values()) clearTimeout(deadline); for (const name of sockets.keys()) stopSockets(name); await new Promise(resolve => server.close(resolve)); } };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const gateway = await createGateway({ livekitInternalUrl: 'http://127.0.0.1:7880', appUrl: process.env.APP_URL, apiKey: process.env.LIVEKIT_API_KEY, apiSecret: process.env.LIVEKIT_API_SECRET, guardSecret: process.env.LIVEKIT_GUARD_SECRET, stateFile: '/state/revocations.json' });
  gateway.server.listen(8090, '127.0.0.1', () => console.log('Budget Worker call gateway listening on loopback'));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { void gateway.close().then(() => process.exit(0)); });
}
