import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Run on the chosen VM. Secrets are written to private files, never stdout.
const base = path.dirname(fileURLToPath(import.meta.url));
const output = path.join(base, 'generated');
const domain = process.env.CALL_DOMAIN || 'calls.budgetworker.in';
const turn = process.env.TURN_DOMAIN || 'turn.budgetworker.in';
const app = process.env.APP_URL || 'https://budgetworker.in';
const validDomain = value => /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(value);
if (!validDomain(domain) || !validDomain(turn) || domain === turn) throw new Error('Use two different valid DNS names');
const appUrl = new URL(app);
if (appUrl.protocol !== 'https:' || appUrl.pathname !== '/' || appUrl.search || appUrl.hash || appUrl.username || appUrl.password) throw new Error('APP_URL must be an HTTPS origin');
const key = 'API' + randomBytes(12).toString('hex');
const secret = randomBytes(48).toString('hex');
const guard = randomBytes(48).toString('hex');
await mkdir(output, { recursive: true, mode: 0o700 });
const save = (name, value) => writeFile(path.join(output, name), value, { flag: 'wx', mode: 0o600 });
await save('livekit.yaml', `port: 7880
bind_addresses: ["127.0.0.1"]
log_level: warn
rtc:
  tcp_port: 7881
  port_range_start: 50000
  port_range_end: 50100
  use_external_ip: true
room:
  max_participants: 2
  empty_timeout: 60
  departure_timeout: 20
turn:
  enabled: true
  domain: ${turn}
  tls_port: 5349
  udp_port: 3478
  external_tls: true
keys:
  ${key}: ${secret}
`);
// Based on the official livekit/deploy Caddy layer4 template. Only the HTTP
// upstream changes: every signaling request must pass the admission gateway.
await save('caddy.yaml', `logging:
  logs:
    default:
      level: ERROR
storage:
  module: file_system
  root: /data
apps:
  tls:
    certificates:
      automate: ["${domain}", "${turn}"]
  layer4:
    servers:
      main:
        listen: [":443"]
        routes:
          - match:
              - tls:
                  sni: ["${turn}"]
            handle:
              - handler: tls
              - handler: proxy
                upstreams:
                  - dial: ["127.0.0.1:5349"]
          - match:
              - tls:
                  sni: ["${domain}"]
            handle:
              - handler: tls
                connection_policies:
                  - alpn: ["http/1.1"]
              - handler: proxy
                upstreams:
                  - dial: ["127.0.0.1:8090"]
`);
const shared = `LIVEKIT_API_KEY=${key}\nLIVEKIT_API_SECRET=${secret}\nLIVEKIT_GUARD_SECRET=${guard}\nAPP_URL=${appUrl.origin}\n`;
await save('gateway.env', shared);
await save('website.env', `LIVEKIT_URL=wss://${domain}\n${shared}`);
console.log('Prepared private configuration in infra/livekit/generated. Import website.env into Vercel privately; no secrets were printed. Existing files are never overwritten.');
