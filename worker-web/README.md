# BudgetWorker for workers

Separate responsive web app for phone registration, profile and availability management, and interview invitations. This app has its own Next.js root and can be deployed on a separate worker domain. It shares the existing BudgetWorker backend and database through a server-side `/api` proxy.

From the repository root, install dependencies with `npm ci`. Start the isolated backend using `npm run dev:preview`; in another terminal run `npm run dev:worker`. Open http://localhost:3001. Test worker: 9876543211, OTP: 123456. A new number can register in local preview mode.

For production, deploy the backend changes first. Deploy `worker-web/` as a separate Next.js app after installing its dependencies; set `BUDGETWORKER_API_ORIGIN` to the HTTPS backend origin. The proxy keeps phone-login cookies on the worker app's domain. Use the same root lockfile versions if installing separately. Production SMS configuration stays on the backend.

New registrations remain pending until an admin publishes them through the existing worker administration screen. Profiles with a matching phone but no account link require the team to link `Worker.userId` before self-service access; registration never automatically claims an existing record. Workers cannot set approval, verified identity, private notes, phone, or account ownership. Placed workers cannot make themselves available without team involvement.

Invitations show the family's name, duties, schedule, area, proposed times and status. Confirmation and secure joining links continue through the existing team-coordinated interview flow. This first release does not include self-service confirmation or in-app calls.

Validation: `npm run test:worker`, `npm run lint`, `npx tsc --noEmit`, and `npm run build:worker` from the repository root. No production database migration is required.
