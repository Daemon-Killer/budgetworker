import { createServer } from 'node:http';

// Local-only provider fixture: no external calls, accounts or paid minutes.
export async function startDailyFixture() {
  const rooms = new Map(), requests = [];
  let failurePath = '';
  const server = createServer(async (req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    let text = ''; for await (const part of req) text += part;
    const body = text ? JSON.parse(text) : undefined;
    function send(status, value) { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); }
    if (pathname === '/__fixture/requests') return send(200, requests);
    if (pathname === '/__fixture/fail') { failurePath = body.path || ''; return send(200, { ok: true }); }
    requests.push({ method: req.method, pathname, body });
    if (failurePath && pathname === failurePath) return send(503, { error: 'Synthetic provider failure' });
    if (pathname === '/v1/rooms' && req.method === 'POST') {
      const room = { ...body, url: 'https://fixture.daily.co/' + body.name };
      rooms.set(body.name, room); return send(200, room);
    }
    const match = pathname.match(/^\/v1\/rooms\/([^/]+)(\/eject)?$/);
    if (match) {
      const name = decodeURIComponent(match[1]), room = rooms.get(name);
      if (!room) return send(404, { error: 'Room not found' });
      if (match[2]) return send(200, { ejected: true });
      if (req.method === 'DELETE') { rooms.delete(name); return send(200, { deleted: true }); }
      if (req.method === 'POST') room.properties = { ...room.properties, ...body.properties };
      return send(200, room);
    }
    if (pathname === '/v1/meeting-tokens' && req.method === 'POST') return send(200, { token: 'synthetic-private-token-' + body.properties.user_id });
    return send(404, { error: 'Fixture endpoint not found' });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, url: 'http://127.0.0.1:' + server.address().port };
}
