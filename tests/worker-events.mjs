import assert from 'node:assert/strict';

export async function testWorkerEvents({ base, admin, client, workerId }) {
  let checks = 0;
  async function connect() {
    const abort = new AbortController();
    const response = await fetch(base + 'workers/events', { signal: abort.signal });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/event-stream/);
    assert.match(response.headers.get('cache-control'), /no-store/);
    checks++;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    return {
      close: () => abort.abort(),
      async next() {
        const timer = setTimeout(() => abort.abort(), 8000);
        try {
          while (true) {
            const boundary = buffer.indexOf('\n\n');
            if (boundary >= 0) {
              const event = buffer.slice(0, boundary);
              buffer = buffer.slice(boundary + 2);
              if (!event.startsWith('event: workers\n')) continue;
              const version = event.split('\n')[1].replace('data: ', '');
              assert.match(version, /^\d+$/); // No worker records or private fields on the stream.
              checks++;
              return BigInt(version);
            }
            const { value, done } = await reader.read();
            assert.equal(done, false, 'live stream remains open');
            buffer += decoder.decode(value, { stream: true });
          }
        } finally { clearTimeout(timer); }
      },
    };
  }
  async function update(token, body, status = 200) {
    const response = await fetch(base + 'admin/workers/' + workerId, {
      method: 'PATCH', headers: {Authorization:'Bearer '+token,'Content-Type':'application/json'}, body:JSON.stringify(body),
    });
    assert.equal(response.status, status);
    checks++;
  }
  let stream = await connect();
  try {
    let version = await stream.next();
    await update(client, { expectedPayInr: 7777 }, 403);
    stream.close();
    stream = await connect();
    assert.equal(await stream.next(), version, 'denied writes do not publish a revision'); checks++;
    await update(admin, { expectedPayInr: 7777 });
    let next = await stream.next();
    assert.ok(next > version, 'web admin edits notify an already-open connection'); checks++;
    version = next;
    await update(admin, { status: 'INACTIVE' });
    next = await stream.next();
    assert.ok(next > version, 'hiding a profile publishes a change'); checks++;
    version = next;
    const hidden = await fetch(base + 'workers/' + workerId);
    assert.equal(hidden.status, 404); checks++;
    // Simulate a change while the browser is disconnected; the first reconnect
    // event must reconcile committed changes, without relying on process memory.
    stream.close();
    await update(admin, { status: 'AVAILABLE' });
    stream = await connect();
    next = await stream.next();
    assert.ok(next > version, 'reconnecting catches changes committed while disconnected'); checks++;
    const visible = await (await fetch(base + 'workers/' + workerId)).json();
    assert.equal(visible.worker.expectedPayInr, 7777);
    assert.equal(visible.worker.phone, undefined); checks++;
  } finally { stream.close(); }
  console.log('PASS: '+checks+' worker event checks covering edits, hiding, reconnects, private data and rejected writes.');
}
