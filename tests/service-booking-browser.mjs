import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base = process.env.TEST_BASE_URL;
if (!base?.startsWith('http://127.0.0.1:')) throw Error('Browser fixtures require the isolated local server');
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
page.setDefaultTimeout(60000);
const errors = []; page.on('pageerror', error => errors.push(error.message));
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
async function continueStep() { await page.getByRole('button', { name: 'Continue', exact: true }).click(); }
async function questions(slug, twins = false) {
  await page.goto(base + '/services/' + slug + '/book');
  await page.locator('#city').fill('Pune'); await page.locator('#area').fill('Baner'); await page.locator('#address').fill('Flat 201, Test Apartments'); await page.locator('#pincode').fill('411045'); await continueStep();
  // Empty responsibilities must keep the user on step 2.
  await continueStep(); await page.locator('form').getByRole('alert').waitFor(); assert((await page.locator('form').getByRole('alert').innerText()).includes('at least one duty'));
  await page.locator('fieldset input[type=checkbox]').first().check();
  if (twins) await page.locator('#babyType').selectOption('twins');
  await continueStep();
  await page.locator('#startDate').fill(today); await page.locator('#name').fill('Browser Test Client'); await continueStep();
  assert.equal(await page.locator('[data-service-plan]').count(), slug.includes('japa') || slug.startsWith('24-hours') ? 2 : 3);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
}
try {
  await questions('domestic-help');
  await page.locator('[data-service-plan]').first().locator('input').check(); await continueStep();
  await page.locator('form input[type=checkbox]').check(); await page.getByRole('button', { name: 'Log in to continue' }).click();
  await page.waitForURL('**/login?next=*');
  await page.getByLabel('Mobile number').fill('9000000002'); await page.getByRole('button', { name: 'Send OTP', exact: true }).click();
  await page.getByLabel('OTP', { exact: true }).fill(process.env.DEV_OTP_CODE); await page.getByRole('button', { name: 'Verify & continue' }).click();
  await page.waitForURL('**/services/domestic-help/book'); await page.getByRole('heading', { name: 'Review your booking' }).waitFor();
  assert((await page.locator('form').innerText()).includes('Browser Test Client')); assert((await page.locator('form').innerText()).includes('₹1,999'));
  await page.locator('form input[type=checkbox]').check(); await page.getByRole('button', { name: 'Pay ₹1,999', exact: true }).click();
  await page.getByRole('heading', { name: 'Test booking saved' }).waitFor();
  await page.getByRole('link', { name: 'View my bookings' }).click(); await page.waitForURL('**/bookings');
  assert((await page.locator('main').innerText()).includes('1 replacement included'));
  assert(!(await page.locator('main').innerText()).includes('9000000077'));
  await page.getByRole('link', { name: 'Resume payment →' }).click();
  await page.getByRole('heading', { name: 'Review your booking' }).waitFor();
  const pendingId = new URL(page.url()).searchParams.get('booking');
  assert(pendingId);
  // A local checkout stub cancels the already-created provider order; it never contacts Razorpay.
  await page.evaluate(() => { window.Razorpay = class { constructor(options) { this.options = options; } on() {} open() { this.options.modal.ondismiss(); } }; });
  await page.locator('form input[type=checkbox]').check();
  const responsePromise = page.waitForResponse(response => response.url().endsWith('/api/service-bookings') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Pay ₹1,999', exact: true }).click();
  const retryData = await (await responsePromise).json(); assert.equal(retryData.bookingId, pendingId);
  await page.locator('form').getByRole('alert').waitFor();
  assert((await page.locator('form').getByRole('alert').innerText()).includes('Payment cancelled'));
  console.log('Verified pending payment resumes the same booking');
  for (const [slug, expected] of [
    ['all-round-home-help', [2499,3999,6999]], ['babycare',[2499,3999,6999]], ['japa-care',[2999,4999]],
    ['24-hours-live-in-domestic-help',[4999,7999]], ['24-hours-live-in-all-round-home-help',[7999,11999]], ['24-hours-live-in-babycare',[7999,11999]], ['24-hours-live-in-japa-care',[3999,6999]],
  ]) {
    await questions(slug);
    const cards = await page.locator('[data-service-plan]').allTextContents();
    expected.forEach((price, i) => assert(cards[i].includes('₹' + price.toLocaleString('en-IN'))));
    console.log('Verified questionnaire and pricing: ' + slug);
  }
  await questions('24-hours-live-in-japa-care', true);
  assert((await page.locator('[data-service-plan]').first().innerText()).includes('₹4,999'));
  assert((await page.locator('[data-service-plan]').last().innerText()).includes('₹8,499'));
  await page.locator('[data-service-plan]').last().locator('input').check(); await continueStep();
  await page.locator('form input[type=checkbox]').check(); await page.getByRole('button', { name: 'Pay ₹8,499', exact: true }).click();
  await page.getByRole('heading', { name: 'Test booking saved' }).waitFor();
  await page.goto(base + '/admin/bookings'); await page.waitForURL('**/?error=admin_only');
  const admin = await browser.newContext();
  assert((await admin.request.post(base + '/api/auth/request-otp', { data: { phone: '9000000001' } })).ok());
  assert((await admin.request.post(base + '/api/auth/verify-otp', { data: { phone: '9000000001', code: process.env.DEV_OTP_CODE } })).ok());
  const adminPage = await admin.newPage(); await adminPage.goto(base + '/admin/bookings');
  assert((await adminPage.locator('main').last().innerText()).includes('Browser Test Client'));
  await admin.close();
  assert.deepEqual(errors, []);
  console.log('PASS: all 8 service questionnaires + Japa twins; draft survives OTP login; actual mock checkout; customer record; admin authorization and saved requirements');
} finally { await context.close(); await browser.close(); }
