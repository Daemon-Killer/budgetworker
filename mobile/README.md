# Budget Worker mobile

The current app source lives on `main` in `mobile/` (brought forward from the original `app` branch). Run commands below from `mobile/`. The root website/API and `shared/` contracts are included for development; keep backend/shared changes aligned with `main`.

Expo SDK 57 / React Native / Expo Router app for Android and iOS. Consumers browse free worker profiles by city/area or GPS, type of help, work arrangement, price and daily hours. Viewing a locked resume shows the existing plans immediately; one credit unlocks one resume. Admins enter worker details, upload resumes, publish profiles and update homepage content. The same app now includes BudgetWorker Saathi worker mode at `/worker`, with a customer/worker chooser on launch and a Saathi shortcut in the customer header.

Copy `.env.example` to `.env`, set `EXPO_PUBLIC_API_URL` to the local backend's LAN URL (Android emulator: http://10.0.2.2:3000), then run `npm install` and `npm start`. Start the isolated local backend using root `npm run dev:preview`; only that backend accepts local demo OTP. Native tokens are stored in SecureStore.

Run `npm run typecheck`, `npm run lint` and `npx expo export --platform all`. Apply both additive backend migrations and deploy the directory API before distributing the app. Production builds target https://budgetworker.in.

Resume downloads use authenticated file requests and the system share/open interface. Checkout opens the website through a two-minute, one-use authenticated handoff, then returns via budgetworker://consumer. Pull to refresh updates credits and saved resumes.

Each unlocked resume includes one admin-coordinated interview. Families request up to three IST slots within 30 days, manage bookings and record an outcome. Admins agree a slot with the worker, create a private invitation and manually copy/share it; nothing is sent automatically. Cancellation and rescheduling retain the included interview until it is completed. An unfinished technical failure can be cancelled and reopened by an admin; a completed interview cannot be reopened.

Confirmed interviews open the website in the device browser using a short-lived, one-use authenticated handoff. Call URLs must match the configured API origin and use HTTPS (loopback/emulator HTTP is permitted only in development). No native camera SDK is bundled. Scheduling works before the self-hosted LiveKit server is connected; joining remains unavailable until its backend settings are configured. The owned call screen uses microphone checks, optional video, mute and leave controls. See infra/livekit/README.md for the India VM setup; the secure browser handoff is unchanged. Test actual iOS/Android microphone/camera, reconnecting and browser return before distributing a new app build.

New resume uploads require a manual contact-review confirmation. Remove phone numbers, email addresses, social handles and other contact details from the uploaded file. Existing resumes must be reviewed and re-uploaded before downloading; unlocked workers retain their interview eligibility.

Version 1.0.2 (Android versionCode 3) keeps package `in.budgetworker.app`. Saathi loads `https://budgetworker.in/saathi` in an authenticated WebView; worker cookies are separate from native customer tokens. It supports document selection/download and native Hindi/English text-to-speech. Worker web updates appear on the next load without a new APK; native changes need a rebuild.

Android arm64 review APKs can be assembled locally. They use test signing and are for sideload testing. Native device acceptance remains, including GPS permission, PDF opening and payment return. iOS compilation/signing requires an Apple developer account; no store submission has been performed.

For Windows Android long paths, the optional config plugin accepts `BUDGETWORKER_CMAKE_STAGING_DIR`. Map the repository to an unused short drive, set the staging path to that drive's `.c` folder and run `npx expo prebuild --platform android --clean --no-install`. Set `EXPO_PUBLIC_API_URL` before prebuild/bundling. Keep the drive mapping through compilation and remove it afterward. Native folders are generated; edit app config/plugins instead.
