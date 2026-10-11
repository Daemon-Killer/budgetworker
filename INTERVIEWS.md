# Interviews included with resume unlocks

Each client/worker resume unlock includes one completed, 15-minute interview with that worker. Requests, rescheduling, cancellations, no-shows and technical retries do not debit another resume credit. Completed interviews cannot be reopened; the family can save an outcome. Existing unlocks qualify too.

## Family flow

Unlock a resume, choose **Request interview**, and propose times in IST with duties, working hours, work locality and indicative monthly pay. The team coordinates the time and the worker accepts a private invitation. Track progress in **Interviews**. Join from ten minutes before the confirmed time until thirty minutes after it.

## Admin coordination

Open `/admin/interviews`. Contact the family and worker privately, choose the agreed time, and copy the newly generated worker invitation. Send it manually through your existing approved communication channel. The website does not send SMS, WhatsApp messages or reminders. Scheduling again rotates the invitation; old links stop working. Keep invitations private.

After a successful conversation, manually mark it completed. Both participants must have opened call access and the scheduled start time must have passed. These access timestamps prove credentials were issued, not that a conversation happened: staff must verify completion. Mark a no-show after the join window ends, or cancel and retry a failed call. A completed interview consumes the included allowance permanently.

## Daily setup

Add `DAILY_API_KEY` as a **server-only Secret** in the existing Vercel project's Production environment and deploy again. Never use a `NEXT_PUBLIC_` prefix or commit the key. Set `APP_URL` or `NEXT_PUBLIC_SITE_URL` to `https://budgetworker.in` so private invitations and mobile handoffs use the canonical website.

Without the key, requests, scheduling and worker acceptance work, and screens show that calls are awaiting setup. With the key, Daily creates private two-person rooms and expiring participant tokens. Camera starts off. Chat, recording controls, transcription and screen sharing are disabled. Verify a real family/worker call on desktop, Android and iPhone before opening the pilot beyond testing.

## Resume privacy

Staff must remove phone numbers, email addresses and other contact details inside each uploaded file, then confirm the review checkbox. Existing files are retained but held for review/re-upload; new unlocks are blocked without charging a credit and downloads are blocked until review. Existing interview entitlements remain valid. Upload filenames are private and downloads use a generic filename. This is a manual review requirement, not automatic PDF redaction. Participants can still choose to share details verbally during a call.

## Mobile app

The `app` branch includes request and booking screens and admin coordination. Calls open the website through a two-minute, one-use sign-in ticket bound to the same account and interview. The worker invitation opens directly in a phone browser. No worker account or native calling SDK is required. A new app build must be distributed before an installed older app gains these screens.

## Verification

Run `npm run test:interviews` for isolated API/database tests with a fake Daily service. It uses fictional users and never spends real calling minutes. Run the directory and migration tests, TypeScript, ESLint and the production build. Real audio/video quality and device permissions still require a configured Daily account and two actual devices.
