import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined, headless: true, args: ['--no-sandbox'] });
try {
 const admin = await browser.newContext();
 await admin.request.post('http://localhost:3000/api/auth/request-otp', {data:{phone:'9999999999'}});
 await admin.request.post('http://localhost:3000/api/auth/verify-otp', {data:{phone:'9999999999',code:'123456'}});
 const page = await admin.newPage();
 await page.goto('http://localhost:3000/admin/saathi');
 await page.getByRole('heading', {name:'BudgetWorker Saathi',exact:true}).waitFor();
 const photo = page.locator('article').filter({hasText:'Meera Patil · PHOTO'});
 await photo.getByRole('button',{name:'Approve',exact:true}).click();
 await photo.waitFor({state:'detached'});
 const request = page.locator('article').filter({hasText:'Please help with salary confirmation for this month.'}).first();
 await request.getByRole('button',{name:'Mark resolved',exact:true}).click();
 await page.getByText('No open requests.',{exact:true}).waitFor();
 const worker = await browser.newContext();
 await worker.request.post('http://localhost:3001/api/auth/request-otp', {data:{phone:'9876543211'}});
 await worker.request.post('http://localhost:3001/api/auth/verify-otp', {data:{phone:'9876543211',code:'123456'}});
 const account = await (await worker.request.get('http://localhost:3001/api/worker-account')).json();
 assert.equal(account.documents.find(d=>d.kind==='PHOTO').status,'APPROVED');
 assert.equal(account.supportRequests[0].status,'RESOLVED');
 const unauthorized = await worker.newPage();
 await unauthorized.goto('http://localhost:3000/admin/saathi');
 assert.ok(!new URL(unauthorized.url()).pathname.startsWith('/admin'));
 const denied = await worker.request.post('http://localhost:3000/api/marketplace/applications/not-real/status',{headers:{Origin:'https://untrusted.example'},data:{action:'accept'}});
 assert.equal(denied.status(),403);
 console.log('PASS: admin document approval, support resolution visible to worker, non-admin access rejected, untrusted API origin rejected.');
} finally { await browser.close(); }
