# Budget Worker deployment

Live website and API: https://budgetworker.in

Vercel project: budget-worker under runtimeterror6969s-projects. PostgreSQL is hosted on Neon. This repository publishes source; the existing Vercel deployment is managed separately.

## Branches

Use main for website/API deployment, with the repository root as the Vercel root directory. The app branch adds mobile/ for Expo development; it is not the website production branch. Shared contracts are in shared/.

## Local development

Run npm ci, then npm run dev:preview. The preview uses a separate, temporary local database and fictional accounts. Local admin: 9999999999; local OTP: 123456. These are local fixtures and are not the hosted admin credentials. Do not run the seed script against production: it replaces seed profiles and plans.

For a persistent development database, copy .env.example to .env and configure your own PostgreSQL URL and session secret.

## Environment configuration

Keep real values in local .env files or Vercel environment settings. The repository includes placeholders only. Configure DATABASE_URL, SESSION_SECRET (at least 32 characters), ADMIN_PHONES, payment settings and the public site URL variables shown in .env.example.

Current hosted testing uses OTP_MODE=dev with ALLOW_PRODUCTION_DEV_OTP=true, an owner-held 8–10 digit DEV_OTP_CODE, an allowlist in DEV_OTP_PHONES, and TEST_ADMIN_PHONES as a subset. Actual hosted login details are maintained privately outside GitHub. Codes are not returned by production API responses.

After MSG91 DLT registration, sender and OTP template approval, configure MSG91_AUTH_KEY and MSG91_TEMPLATE_ID, set OTP_MODE=msg91 and disable ALLOW_PRODUCTION_DEV_OTP. Rotate or remove the hosted test code before opening access beyond the test group.

Razorpay currently uses test credentials. Configure real live credentials and verify payments before taking real purchases.

## Publishing

Run npm run lint and npx tsc --noEmit. Existing isolated tests are npm run test:otp, npm run test:migration and npm run test:directory. Verify the backup and target database before applying migrations. The Vercel build command runs prisma migrate deploy; never connect an unreviewed database or use db push on production.

Deploy a candidate with vercel deploy --prod --skip-domain, verify its website and API, then promote the reviewed deployment. Keep the previous deployment available for rollback. Do not upload .env, .vercel, database snapshots or signing material.

Git integration, if connected later, should deploy only main with the existing environment configuration and backup process.

## Mobile

Check out app, then install and build in mobile/. Set EXPO_PUBLIC_API_URL to https://budgetworker.in for a hosted build, or the local backend's LAN URL for development. Apply compatible backend migrations before distributing the app. See mobile/README.md for native configuration and acceptance checks. Review APKs use test signing; app-store releases require production signing and developer accounts.
