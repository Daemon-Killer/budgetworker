import { PGlite } from '@electric-sql/pglite';
import { fromNodeSocket } from 'pg-gateway/node';
import { createServer } from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const db = new PGlite();
await db.waitReady;
for (const name of fs.readdirSync(path.join(root, 'prisma/migrations')).filter(n => /^\d/.test(n)).sort()) {
  await db.exec(fs.readFileSync(path.join(root, 'prisma/migrations', name, 'migration.sql'), 'utf8'));
}
const tcp = createServer(socket => {
  socket.on('error', () => {});
  fromNodeSocket(socket, {
    auth: { method: 'trust' },
    async onStartup() { await db.exec('DEALLOCATE ALL'); },
    async onMessage(data, { isAuthenticated }) {
      if (!isAuthenticated) return;
      if (data[0] === 88) return new Uint8Array();
      return (await db.execProtocol(data, { throwOnError: false })).data;
    },
  }).catch(() => socket.destroy());
});
await new Promise(resolve => tcp.listen(0, '127.0.0.1', resolve));
const env = {
  ...process.env,
  DATABASE_URL: `postgresql://postgres:postgres@127.0.0.1:${tcp.address().port}/postgres?connection_limit=1`,
  PAYMENT_MODE: 'mock', OTP_TEST_ISOLATED: 'true', NODE_ENV: 'production',
  SESSION_SECRET: randomBytes(32).toString('hex'), ADMIN_PHONES: '',
  OTP_MODE: 'dev', OTP_MAX_PER_PHONE_HOUR: '5', DEV_OTP_CODE: '85936247',
  ALLOW_PRODUCTION_DEV_OTP: 'true',
  DEV_OTP_PHONES: '9000000001,9000000002,9000000003', TEST_ADMIN_PHONES: '9000000001',
  MSG91_AUTH_KEY: '', MSG91_TEMPLATE_ID: '',
};
try {
  const status = await new Promise(resolve => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'tests/service-bookings-flow.ts'], { cwd: root, env, stdio: 'inherit' });
    child.on('exit', resolve);
  });
  if (status !== 0) process.exitCode = 1;
  else if (process.argv.includes('--browser')) {
    const probe = createServer(); await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
    const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
    const browserEnv = { ...env, NODE_ENV: 'development', NEXT_DIST_DIR: '.next-service-booking-test', NEXT_TELEMETRY_DISABLED: '1', TEST_BASE_URL: `http://127.0.0.1:${port}`, ADMIN_PHONES: '9000000001', RAZORPAY_KEY_ID: 'rzp_test_isolated', RAZORPAY_KEY_SECRET: 'isolated-test-secret', NEXT_PUBLIC_RAZORPAY_KEY_ID: '' };
    const app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', ...(process.env.BUDGETWORKER_TEST_WEBPACK === '1' ? ['--webpack'] : []), '--hostname', '127.0.0.1', '--port', String(port)], { cwd: root, env: browserEnv, stdio: ['ignore', 'pipe', 'pipe'] });
    let logs = ''; app.stdout.on('data', output => { logs += output; }); app.stderr.on('data', output => { logs += output; });
    try {
      let ready = false;
      for (let i = 0; i < 60; i++) {
        if (app.exitCode !== null) throw new Error('Booking server exited: ' + logs);
        try { if ((await fetch(browserEnv.TEST_BASE_URL + '/api/packs', { signal: AbortSignal.timeout(5000) })).ok) { ready = true; break; } } catch {}
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      if (!ready) throw new Error('Booking test server failed to start: ' + logs);
      const browserStatus = await new Promise(resolve => {
        const child = spawn(process.execPath, ['--import', 'tsx', 'tests/service-booking-browser.mjs'], { cwd: root, env: browserEnv, stdio: 'inherit' }); child.on('exit', resolve);
      });
      if (browserStatus !== 0) { process.exitCode = 1; console.error(logs.slice(-6000)); }
    } finally {
      if (app.exitCode === null) {
        const exited = new Promise(resolve => app.once('exit', resolve));
        if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(app.pid), '/T', '/F'], {stdio: 'ignore'});
        else app.kill('SIGTERM');
        await exited;
      }
    }
  }
} finally { tcp.close(); await db.close(); }
