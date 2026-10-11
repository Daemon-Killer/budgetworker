# Budget Worker

Location-based home-help directory. Consumers browse free worker profiles, filter by city/area or GPS radius, type of help, work arrangement, daily hours and expected pay. Full resumes require one credit each, purchased through the existing resume plans. Repeated downloads of an unlocked resume are free. A separate worker web app in `worker-web/` supports phone registration, profile and availability management, and viewing interview invitations. See [worker web setup](worker-web/README.md).

## GitHub branches

- `main`: deployed Next.js website, API, Prisma schema/migrations, public assets, shared contracts and backend tests.
- `app`: builds on `main` and adds the Expo Android/iOS app in `mobile/`. The API and shared contracts remain available so both clients can be developed together.

Clone `main` for website work. For app work, use `git clone --branch app https://github.com/Daemon-Killer/budgetworker.git`, then `cd budgetworker/mobile`. Merge backend/shared changes from `main` into `app` as needed; app-specific files belong on `app`.

Secrets, production OTP credentials, database backups, APKs, generated native folders and dependencies are excluded. Copy the relevant `.env.example` for local configuration.

## Workspaces

- `/` and `/workers`: directory and filters; `/workers/[id]`: free details and paid resume access.
- `/packs` and `/account`: plans, credits and saved resumes.
- `/admin/workers`: add/edit worker details, upload a resume, publish/hide profiles and choose neighbourhood locations.
- `/admin/marketplace`: homepage text and announcements.
- On `app`, `mobile/`: Expo SDK 57 Android/iOS app with consumer and admin modes. Old job routes remain dormant for future work; job posting is disabled.

## Local review and validation

Run `npm install`, then `npm run dev:preview`. It starts an isolated, temporary PostgreSQL database and website at http://localhost:3000, with no production seeding. Local customer phone: 9876543210; admin: 9999999999; OTP: 123456. Hosted testing uses restricted server-configured test access; see DEPLOY.md.

Run `npm run lint`, `npx tsc --noEmit`, `npm run test:migration`, `npm run test:directory` and `npm run build`. The directory integration suite covers location/filter searches, role enforcement, worker/resume management, paywalls, concurrent credit deductions, authenticated downloads and one-use mobile checkout handoff. Payment callback tests cover concurrent fulfillment and invalid callbacks. Stop Prisma-backed previews before regenerating Prisma on Windows if its DLL is locked.

Worker directories and open worker profiles update automatically after admin changes, normally within about two seconds. Updates preserve submitted filters, pending filter edits and the current page; an emptied final page returns to the last valid page. Hidden tabs pause the connection and reconcile on return. Hidden workers disappear from searches and open profiles; republishing restores them. The server-sent event stream carries only a database revision, and profile data still comes from the existing public APIs.

Run `npx playwright install chromium` once, then `npm run test:realtime` for isolated browser tests of publication, live edits, hiding/republishing, filters, pagination and reconnects. To use an installed Chromium instead, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its executable path. Stop local previews before running this suite; it starts its own temporary database and website.

On the `app` branch, inside `mobile/`, run `npm run lint`, `npm run typecheck` and `npx expo export --platform all`. Native device acceptance and store signing are separate release steps.

## Architecture and rollout

Next.js 16.3.8, React 19, TypeScript, Prisma 5 and PostgreSQL. Shared directory contracts live in `shared/directory.ts`. Cookie and native bearer authentication share database-enforced roles. Native tokens use SecureStore. Public responses omit private phone numbers, internal notes, precise coordinates and resume bytes.

Directory searches apply all filters and geographic distance before pagination. Structured prices are compared only within the selected pay period. Legacy salary text is retained; ambiguous amounts require admin review before price filtering. Admin drafts publish after the resume upload succeeds. Resume unlocks and payment fulfillment lock the relevant database rows to prevent duplicate debits or credits.

The additive `20261004170000_worker_directory` migration preserves prior records and resumes, adds structured pay/hours, disables job posting and adds short-lived checkout tickets. Back up the database before running `npm run db:deploy`. Deploy the web API before distributing the mobile app. Production builds require a session secret of at least 32 characters, real admin phones and configured SMS delivery.

Mobile checkout uses a two-minute, one-use browser handoff; no bearer tokens appear in download URLs. Android/iOS production API URL is https://budgetworker.in. Android review APKs use test signing; App Store/Play Store releases need account credentials and production signing.

Admin neighbourhood lookup uses the public Photon/OpenStreetMap service with caching and an explicit lookup action. `GEOCODER_URL` can point to a dedicated provider or self-hosted Photon for production scale; the public demo has no availability guarantee. City/area entry works without a map pin, but GPS radius results require worker coordinates.

## Current limits

Temporary production testing can use `OTP_MODE=dev` only with `ALLOW_PRODUCTION_DEV_OTP=true`, an owner-held 8–10 digit `DEV_OTP_CODE`, approved `DEV_OTP_PHONES`, and `TEST_ADMIN_PHONES` as a subset. Hosted test codes are never returned to clients or written to application logs. Users request a login challenge and manually enter the private code; expiry, one-use challenges and attempt limits still apply. Repeated test requests reuse the unconsumed challenge without resetting its ten-minute expiry or five incorrect attempts. Test mode permits 30 new challenges per phone/code per hour independently of earlier SMS requests; SMS retains `OTP_MAX_PER_PHONE_HOUR` (default five). Local preview continues to show `123456`. Restore `OTP_MODE=msg91` and disable the opt-in after DLT setup; rotate the temporary code if it is shared outside the test team. Admin roles assigned to approved test owners persist in the database.

Razorpay is configured with test credentials; real purchases require live keys and a live-payment verification. Resumes remain database bytes with a 4 MB upload limit. Admin lists show the latest 100 workers. Scalability has not been load-tested; growing volumes need PostGIS/search indexes, paginated admin operations and private object storage. Native GPS, document opening and checkout return should be verified on real devices before broad distribution.

Review the current dependency audit before a public or store release. No forced framework downgrade has been applied.
