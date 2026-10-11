import { createServer } from 'node:http';
import { TokenVerifier } from 'livekit-server-sdk';
export const fixtureKey = 'synthetic-livekit-key';
export const fixtureSecret = 'synthetic-livekit-secret-at-least-32-characters';
export const fixtureGuard = 'synthetic-gateway-secret-at-least-32-characters';

// Only the media API is simulated. The actual SDK creates/verifies JWTs.
export async function startLiveKitFixture() {
  const rooms = new Map(), requests = [];
  const verifier = new TokenVerifier(fixtureKey, fixtureSecret);
  let failurePath = '';
  const server = createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      let text = ''; for await (const part of req) text += part;
      const body = text ? JSON.parse(text) : undefined;
      function send(status, value) { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); }
      if (pathname === '/__fixture/requests') return send(200, requests);
      if (pathname === '/__fixture/fail') { failurePath = body.path || ''; return send(200, { ok: true }); }
      requests.push({ method: req.method, pathname, body });
      if (failurePath === pathname) return send(503, { code: 'unavailable', msg: 'Synthetic failure' });
      if (pathname === '/bw/revoke') {
        if (req.headers.authorization !== 'Bearer ' + fixtureGuard) return send(401, {});
        rooms.delete(body.roomName); return send(200, { closed: true });
      }
      const claims = await verifier.verify((req.headers.authorization || '').replace(/^Bearer /, ''), 0);
      if (claims.video?.roomJoin) return send(403, {});
      if (pathname === '/twirp/livekit.RoomService/CreateRoom') {
        const room = { ...body, sid: 'RM_fixture', creationTime: String(Math.floor(Date.now() / 1000)) };
        rooms.set(body.name, room); return send(200, room);
      }
      if (pathname === '/twirp/livekit.RoomService/ListRooms') return send(200, { rooms: [...rooms.values()] });
      if (pathname === '/twirp/livekit.RoomService/DeleteRoom') { rooms.delete(body.room); return send(200, {}); }
      return send(404, { code: 'not_found', msg: 'Fixture endpoint not found' });
    } catch { res.writeHead(500); res.end('{}'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, url: 'http://127.0.0.1:' + server.address().port };
}
