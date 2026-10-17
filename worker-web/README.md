# BudgetWorker for workers

Separate responsive web app for phone registration, profile and availability management, and interview invitations. This app has its own Next.js root and can be deployed on a separate worker domain. It shares the existing BudgetWorker backend and database through a server-side `/api` proxy.

From the repository root, install dependencies with `npm ci`. Start the isolated backend using `npm run dev:preview`; in another terminal run `npm run dev:worker`. Open http://localhost:3001. Test worker: 9876543211, OTP: 123456. A new number can register in local preview mode.

For production, deploy the backend changes first. Deploy `worker-web/` as a separate Next.js app after installing its dependencies; set `BUDGETWORKER_API_ORIGIN` to the HTTPS backend origin. The proxy keeps phone-login cookies on the worker app's domain. Set `WORKER_WEB_ORIGINS=https://your-worker-domain` on the backend to allow job actions from that exact origin (comma-separated for multiple worker deployments). Development defaults allow localhost:3001 and 127.0.0.1:3001. Use the same root lockfile versions if installing separately. Production SMS configuration stays on the backend.

New registrations remain pending until an admin publishes them through the existing worker administration screen. Profiles with a matching phone but no account link require the team to link `Worker.userId` before self-service access; registration never automatically claims an existing record. Workers cannot set approval, verified identity, private notes, phone, or account ownership. Placed workers cannot make themselves available without team involvement.

Invitations show the family's name, duties, schedule, area, proposed times and status. Confirmation and secure joining links continue through the existing team-coordinated interview flow. This first release does not include self-service confirmation or in-app calls.

Validation: `npm run test:worker`, `npm run lint`, `npx tsc --noEmit`, and `npm run build:worker` from the repository root. The Saathi release requires the migration described below.

## BudgetWorker Saathi

The Saathi interface follows the green/blue worker onboarding reference, with Hindi and English throughout the navigation, login, profile, jobs, duty card, current job and help flows. Jobs and salaries come from real marketplace records; no sample match percentages or fabricated verification indicators are shown. Listen buttons use the device's speech synthesis and available Hindi/English voices.

Apply migration `20261011160000_saathi_documents_support` on the backend **before deploying this worker app**. It adds private document storage (JPG/PNG/PDF, 2 MB maximum) and worker support requests. Files are available only to their owner and authenticated admins, never through the public directory. Replacing identity/police documents resets the corresponding verification badge. Review pending documents and support requests in `/admin/saathi`; review actions require admin authentication and are audited.

Duty cards show the actual job description, schedule and pay. An offered job can be accepted explicitly; this is the existing marketplace hiring action, not a fabricated contract. Weekly off and start date should be included in the job description until dedicated fields exist. Workers can submit salary, leave, extra work and other concerns; this is not a payroll system. Emergency assistance links to India's 112 service. The reference's placeholder support number is not used. Bengali, Tamil and Telugu are not yet offered; only fully supported Hindi/English options are shown.

The standalone worker-web development app remains available. The existing Expo APK integration is described below.

Browser check against the isolated preview backend and worker server:
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node tests/worker-web-browser.mjs`

After the worker browser check, run `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node tests/saathi-admin-browser.mjs` against the same isolated preview to verify admin document review and support resolution. Never run these fixture-based tests against production.

## Existing APK integration

Production is served at `https://budgetworker.in/saathi` in the existing Vercel project. `npm run build:saathi` exports the isolated worker UI into generated `public/saathi` files, keeping its styles separate from the customer website. Its `/api` requests use the same domain; no extra worker-domain setting is required for this deployment.

The existing Expo application now lives in `mobile/` on main (originally from the app branch). Version 1.0.2 / Android versionCode 3 retains package `in.budgetworker.app`. Its start screen offers customer and Saathi worker modes; worker mode embeds the live `/saathi` UI. This is an update to the existing app, not a separate Saathi app. Internet is required for worker mode. Future worker web deployments are visible within this mode without replacing the APK; native changes still need a new APK build.

## Worker profile persistence

The profile form saves through authenticated `PUT /api/worker-account` to the existing hosted PostgreSQL database. Reopening Saathi or signing into the same phone account on another device reads that saved record through `GET /api/worker-account`. The database response confirms a successful save; failed writes retain the draft and show an error. Profile access and saving continue when job-list endpoints fail, with a separate job-loading warning and retry button. Language preference is stored locally; worker profiles are not.

Run `npm run test:saathi-profile` with Playwright Chromium installed (or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`). It builds the embedded `/saathi` app and uses the isolated test database to verify login and saving during job outages, write-failure feedback, retry, and profile restoration in a fresh browser session. Production testing remains restricted to approved phones until real SMS delivery is activated. Google Drive is used for build delivery/backups, not profile records.
