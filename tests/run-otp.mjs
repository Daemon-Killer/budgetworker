import { PGlite } from '@electric-sql/pglite';
import { fromNodeSocket } from 'pg-gateway/node';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
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
  OTP_TEST_ISOLATED: 'true', NODE_ENV: 'production',
  SESSION_SECRET: randomBytes(32).toString('hex'), ADMIN_PHONES: '',
  OTP_MODE: 'dev', OTP_MAX_PER_PHONE_HOUR: '5', DEV_OTP_CODE: '85936247',
  ALLOW_PRODUCTION_DEV_OTP: 'true',
  DEV_OTP_PHONES: '9000000001,9000000002,9000000003', TEST_ADMIN_PHONES: '9000000001',
  MSG91_AUTH_KEY: '', MSG91_TEMPLATE_ID: '',
};
try {
  const status = await new Promise(resolve => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'tests/otp-flow.ts'], { cwd: root, env, stdio: 'inherit' });
    child.on('exit', resolve);
  });
  if (status !== 0) process.exitCode = 1;
} finally { tcp.close(); await db.close(); }
