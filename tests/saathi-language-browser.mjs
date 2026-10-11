import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.setDefaultTimeout(15000);
  page.on('pageerror', e => console.error(e.message));
  let failSession = false;
  await page.route('**/api/auth/me', route => failSession ? route.abort() : route.fulfill({ json: { user: null } }));
  await page.goto(process.env.SAATHI_BASE_URL || 'http://localhost:3001');
  await page.getByRole('heading', { name: 'अपनी भाषा चुनें' }).waitFor();
  await page.getByRole('button', { name: 'English' }).click();
  await page.getByRole('heading', { name: 'Choose your language' }).waitFor();
  await page.getByText('Find work easily.').waitFor({ state: 'attached' });
  assert.equal(await page.evaluate(() => localStorage.getItem('saathi-language')), 'en');
  await page.reload();
  await page.getByRole('heading', { name: 'Login with your mobile' }).waitFor();
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  failSession = true;
  await page.reload();
  await page.getByRole('heading', { name: 'Login with your mobile' }).waitFor();
  await page.getByRole('button', { name: 'Back', exact: false }).click();
  await page.getByRole('button', { name: 'हिंदी' }).click();
  await page.getByRole('heading', { name: 'अपनी भाषा चुनें' }).waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('saathi-language')), 'hi');
  console.log('PASS: English selection, immediate persistence, reload, failed session restore, Hindi switch');
} finally { await browser.close(); }
