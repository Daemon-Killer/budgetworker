# Budget Worker mobile

This app lives on the `app` branch. Run commands below from `mobile/`. The root website/API and `shared/` contracts are included for development; keep backend/shared changes aligned with `main`.

Expo SDK 57 / React Native / Expo Router app for Android and iOS. Consumers browse free worker profiles by city/area or GPS, type of help, work arrangement, price and daily hours. Viewing a locked resume shows the existing plans immediately; one credit unlocks one resume. Admins enter worker details, upload resumes, publish profiles and update homepage content. Worker mode is deferred.

Copy `.env.example` to `.env`, set `EXPO_PUBLIC_API_URL` to the local backend's LAN URL (Android emulator: http://10.0.2.2:3000), then run `npm install` and `npm start`. Start the isolated local backend using root `npm run dev:preview`; only that backend accepts local demo OTP. Native tokens are stored in SecureStore.

Run `npm run typecheck`, `npm run lint` and `npx expo export --platform all`. Apply both additive backend migrations and deploy the directory API before distributing the app. Production builds target https://budgetworker.in.

Resume downloads use authenticated file requests and the system share/open interface. Checkout opens the website through a two-minute, one-use authenticated handoff, then returns via budgetworker://consumer. Pull to refresh updates credits and saved resumes.

Android arm64 review APKs can be assembled locally. They use test signing and are for sideload testing. Native device acceptance remains, including GPS permission, PDF opening and payment return. iOS compilation/signing requires an Apple developer account; no store submission has been performed.

For Windows Android long paths, the optional config plugin accepts `BUDGETWORKER_CMAKE_STAGING_DIR`. Map the repository to an unused short drive, set the staging path to that drive's `.c` folder and run `npx expo prebuild --platform android --clean --no-install`. Set `EXPO_PUBLIC_API_URL` before prebuild/bundling. Keep the drive mapping through compilation and remove it afterward. Native folders are generated; edit app config/plugins instead.
