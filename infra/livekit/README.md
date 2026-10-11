# Budget Worker calls on an India VM

The website/API stays on Vercel and PostgreSQL stays on Neon. This package runs the LiveKit media server, Budget Worker admission gateway and Caddy TLS/TURN proxy on one always-on Linux VM. No LiveKit Cloud or Daily account is needed. No server has been purchased or provisioned yet.

## Pilot hosting

Start with Ubuntu 24.04 LTS x64, 2 vCPU, 4 GB RAM, a static public IPv4 and 40–80 GB disk in India. For example, a DigitalOcean Basic Regular Droplet in Bangalore (BLR1), 2 vCPU/4 GB/80 GB/4 TB transfer, is listed at **US$24/month**, excluding taxes, backups and overages (checked 11 October 2026). This is a small-pilot starting recommendation, not a tested call-capacity guarantee. Dedicated CPU is preferable when usage grows. Keep CPU, RAM, concurrent calls and outgoing bandwidth under observation; load-test before increasing access.

Sources: [Droplet pricing](https://www.digitalocean.com/pricing/droplets), [region availability](https://docs.digitalocean.com/platform/regional-availability/), [LiveKit deployment requirements](https://docs.livekit.io/transport/self-hosting/deployment/).

## Prepare and start

1. Create the VM with an SSH key; keep administrative SSH restricted to the owner's IP. Install Docker Engine with its Compose plugin and Node.js 24 using the official provider/vendor guides. Do not put the database or website on this VM.
2. Add DNS **A** records `calls.budgetworker.in` and `turn.budgetworker.in` pointing to the VM's static IPv4. Use DNS-only records if a CDN is in front of the domain. Add AAAA only if IPv6 is configured and tested on the server.
3. In both the provider firewall and host firewall allow TCP **80, 443, 7881**, UDP **3478, 50000–50100**. Keep TCP **7880, 8090, 5349** blocked from the public Internet. HTTPS and TURN/TLS both use 443, routed by their separate TLS hostnames. Never publish the private signaling/API port 7880: it would bypass booking checks. Do not disable the firewall to troubleshoot.
4. Copy this `infra/livekit` directory to a private directory on the VM, e.g. `/opt/budgetworker-calls`, and run `node prepare.mjs` once. It generates private files in `generated/`; it refuses to overwrite them. Optional environment overrides are `CALL_DOMAIN`, `TURN_DOMAIN`, `APP_URL`. The defaults use the domains above. No keys are printed.
5. Privately import `generated/website.env` into the existing Vercel Production environment, then deploy the website. `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` and `LIVEKIT_GUARD_SECRET` must be Secret values. Do not paste these files into chat, Pages or GitHub. Keep a secure copy for recovery. Remove the unused `DAILY_API_KEY` after the new version is active.
6. Run `docker compose -f compose.yaml config --quiet`, then `docker compose -f compose.yaml up -d --build`. Caddy provisions and renews both TLS certificates automatically. LiveKit is pinned to v1.13.9; the official Caddy layer4 image is pinned by digest. The gateway runs as the unprivileged Node user. There is no recording/egress service. Single-node LiveKit does not require Redis; adding nodes later requires shared Redis and shared revocation state, plus routing and load testing.
7. Check `curl --fail https://calls.budgetworker.in/healthz`. Verify `ss -lntp` shows 7880 and 8090 only on loopback, and confirm from another machine that 7880/8090/5349 are unreachable. Resolve both DNS names and verify certificate hostnames/expiry. Log only operational errors; never enable URL/access-token logging.

No Docker commands here have been run on a purchased VM. Linux host networking, certificate issuance and firewall reachability must be verified on the actual server.

## Required acceptance before activating calls

- Use two fictional test participants in an unlocked, scheduled, accepted interview. Test desktop/Android/iPhone microphones, optional camera, speaker recovery, reconnect and leave. Verify camera/mic indicators disappear after leave/navigation.
- Test one caller on mobile data and another on Wi-Fi. Force UDP unavailable on a test network to confirm TURN/TLS on 443. Check Firefox separately: depending on proxy/TURN behavior it can require PROXY protocol configuration (see the current LiveKit TURN documentation).
- Cancel and reschedule an active call. Both participants must disconnect, and cached tokens/old invitations must fail. Try a third participant and a different identity; both must be denied. Confirm no extra resume credits are spent.
- Confirm the room closes at the existing deadline, even with the browser timer suspended. The guardian checks every five seconds; it fails closed on booking/API errors. A successful cancellation persists a tombstone and deletes the room before the API acknowledges it. Provider failure leaves the booking unchanged and closes admission until recovered; retry the action.
- Stop/restart the gateway and repeat token replay checks. Stop Vercel booking access and confirm active rooms close and new admissions fail. A VM outage can interrupt calls; there is no high availability in this single-server pilot.

## Maintenance and recovery

Monitor `/healthz` every minute, CPU/RAM, network transfer, container restarts and disk space. Alert the owner on failures. Back up the private generated configuration and the `gateway_state` Docker volume (revocation tombstones) securely; also retain `caddy_data` for certificate continuity. Never use `docker compose down -v` on a live system. Restore revocation state before reopening admission. If state is lost or suspected compromised, rotate the LiveKit API and guard secrets in both VM and Vercel, redeploy, and cancel/reschedule affected bookings before opening calls.

Use `docker compose -f compose.yaml logs --tail 100` for operational diagnostics without publishing logs. Roll upgrades during a maintenance window with no active interviews; pin the new version/digest, rerun admission and device acceptance, and retain the previous images for rollback. A second VM needs a redesign of the single-node gateway state rather than simply adding a replica.

## Local verification

From the repository root: `node --test infra/livekit/gateway/test.mjs` and `npm run test:interviews`. Tests use temporary data and private local fixtures. If a real LiveKit binary is available, `LIVEKIT_SMOKE_BINARY=/absolute/path/livekit-server node tests/livekit-smoke.mjs` starts it on loopback and verifies the SDK, gateway signaling, cancellation and replay against that server. It does not test actual audio/video or Internet TURN.

The gateway is mandatory because [self-hosted tokens are not revoked on participant removal](https://docs.livekit.io/frontends/reference/tokens-grants/). TLS/TURN configuration follows the [official VM guide](https://docs.livekit.io/transport/self-hosting/vm/) and [deployment templates](https://github.com/livekit/deploy).
