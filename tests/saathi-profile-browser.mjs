import assert from 'node:assert/strict';
import { chromium } from 'playwright';

// This test is run only by the isolated database/backend harness.
const base = process.env.TEST_BASE_URL;
assert.ok(base && new URL(base).hostname === '127.0.0.1', 'Isolated backend required');
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  headless: true,
  args: ['--no-sandbox'],
});
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const jobFailure = route => route.fulfill({ status: 503, json: { error: 'Jobs temporarily unavailable' } });
  await page.route('**/api/marketplace/me', jobFailure);
  await page.route('**/api/marketplace/jobs*', jobFailure);
  await page.goto(base + '/saathi');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Mobile number').fill('9876543211');
  await page.getByRole('button', { name: 'Send OTP', exact: true }).click();
  await page.getByLabel('Verification code').fill('123456');
  await page.getByRole('button', { name: 'Verify & continue' }).click();
  await page.getByRole('heading', { name: 'Hello, Meera' }).waitFor();
  await page.getByText('Jobs are temporarily unavailable.', { exact: false }).waitFor();
  const nav = page.getByRole('navigation');
  await nav.getByRole('button', { name: 'Jobs', exact: true }).click();
  assert.equal(await page.getByText('No jobs available right now', { exact: true }).count(), 0);
  await nav.getByRole('button', { name: 'Profile', exact: true }).click();

  // A committed save must be acknowledged even if a subsequent account GET fails.
  const readFailure = route => route.request().method() === 'GET'
    ? route.fulfill({ status: 503, json: { error: 'Account refresh unavailable' } })
    : route.continue();
  await page.route('**/api/worker-account', readFailure);
  const savedSkill = 'Persisted despite job service outage';
  await page.getByLabel('Your skills').fill(savedSkill);
  await page.getByLabel('Age', { exact: true }).fill('33');
  await page.getByRole('button', { name: 'Save my profile', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Profile saved.' }).waitFor();
  const account = await (await context.request.get(base + '/api/worker-account')).json();
  assert.equal(account.profile.skill, savedSkill);
  assert.equal(account.profile.age, 33);

  // A failed write must retain the draft and must not show a success message.
  const writeFailure = route => route.request().method() === 'PUT'
    ? route.fulfill({ status: 503, json: { error: 'Profile save unavailable' } })
    : route.continue();
  await page.route('**/api/worker-account', writeFailure);
  await page.getByLabel('Your skills').fill('Unsaved draft');
  await page.getByRole('button', { name: 'Save my profile', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Profile save unavailable' }).waitFor();
  assert.equal(await page.getByRole('status').filter({ hasText: 'Profile saved.' }).count(), 0);
  assert.equal(await page.getByLabel('Your skills').inputValue(), 'Unsaved draft');
  const unchanged = await (await context.request.get(base + '/api/worker-account')).json();
  assert.equal(unchanged.profile.skill, savedSkill);

  await page.unroute('**/api/worker-account');
  await page.unroute('**/api/marketplace/me');
  await page.unroute('**/api/marketplace/jobs*');
  await page.getByRole('button', { name: 'Retry loading jobs', exact: true }).click();
  await page.getByText('Jobs are temporarily unavailable.', { exact: false }).waitFor({ state: 'detached' });
  assert.equal(await page.getByLabel('Your skills').inputValue(), 'Unsaved draft');
  await context.close();

  // A fresh browser session, without localStorage or cookies, loads the saved record.
  const fresh = await browser.newContext();
  for (const path of ['request-otp', 'verify-otp']) {
    const response = await fresh.request.post(base + '/api/auth/' + path, {
      data: { phone: '9876543211', ...(path === 'verify-otp' ? { code: '123456' } : {}) },
    });
    assert.equal(response.status(), 200);
  }
  const restored = await fresh.newPage();
  await restored.goto(base + '/saathi');
  await restored.getByRole('button', { name: 'English', exact: true }).click();
  await restored.getByRole('navigation').getByRole('button', { name: 'Profile', exact: true }).click();
  assert.equal(await restored.getByLabel('Your skills').inputValue(), savedSkill);
  assert.equal(await restored.getByLabel('Age', { exact: true }).inputValue(), '33');
  await fresh.close();
  console.log('PASS: embedded Saathi login and profile persistence during job outages, accurate save/failure feedback, retained drafts, job retry, and restoration in a fresh browser session.');
} finally {
  await browser.close();
}
