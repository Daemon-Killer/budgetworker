import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base=process.env.TEST_BASE_URL;
if(!base?.startsWith('http://127.0.0.1:'))throw Error('Worker form fixtures require the isolated local server');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true});
const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();page.setDefaultTimeout(45000);
const errors=[];page.on('pageerror',error=>errors.push(error.message));
try{
 await page.goto(base+'/');
 const section=page.locator('#work-with-us');await section.scrollIntoViewIfNeeded();
 assert.equal(await section.locator('form').count(),0);
 assert.equal(await section.getByRole('link').count(),2);
 await section.getByRole('link',{name:/^Register for Work/}).click();await page.waitForURL('**/register-for-work');
 async function fill(kind){
  await page.locator('#'+kind+'-name').fill(kind==='REGISTER'?'Browser Registered Worker':'Browser Referred Worker');await page.locator('#'+kind+'-phone').fill(kind==='REGISTER'?'9000000021':'9000000022');await page.locator('#'+kind+'-age').fill('30');await page.locator('#'+kind+'-gender').selectOption('Female');await page.locator('#'+kind+'-city').fill('Pune');await page.locator('#'+kind+'-area').fill('Baner');await page.locator('#'+kind+'-monthlySalary').fill('15000');
  const panel=page.locator('main');
  await panel.locator('input[name=workTypes]').first().check();await panel.locator('input[name=languages]').first().check();await panel.locator('input[name=consent]').check();
  return panel;
 }
 const panel=await fill('REGISTER');await page.locator('#REGISTER-alternatePhone').fill('+91 9000000024');await panel.getByRole('button',{name:/^Register for work/}).click();await panel.getByRole('status').waitFor();assert((await panel.innerText()).includes('registration has been received'));
 await page.goto(base+'/');await page.locator('#work-with-us').getByRole('link',{name:/^Refer a Worker/}).click();await page.waitForURL('**/refer-a-worker');const referral=await fill('REFER');
 await page.locator('#REFER-referrerName').fill('Browser Referrer');await page.locator('#REFER-referrerPhone').fill('9000000023');await page.locator('#REFER-relationship').selectOption('Friend');
 await referral.locator('input[name=arrangements][value="Part-time"]').uncheck();await referral.locator('input[name=arrangements][value="24-hour Live-in"]').check();assert.equal(await referral.locator('#REFER-dailyHours').count(),0);
 await referral.getByRole('button',{name:/^Submit referral/}).click();await referral.getByRole('status').waitFor();assert((await referral.innerText()).includes('Thank you for referring a worker'));
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 const denied=await context.request.get(base+'/api/worker-leads');assert.equal(denied.status(),405);
 await page.goto(base+'/admin/worker-enquiries');await page.waitForURL('**/login?next=*');
 const admin=await browser.newContext();assert((await admin.request.post(base+'/api/auth/request-otp',{data:{phone:'9000000001'}})).ok());assert((await admin.request.post(base+'/api/auth/verify-otp',{data:{phone:'9000000001',code:process.env.DEV_OTP_CODE}})).ok());
 const adminPage=await admin.newPage();await adminPage.goto(base+'/admin/worker-enquiries');const content=await adminPage.locator('main').last().innerText();assert(content.includes('Browser Registered Worker'));assert(content.includes('9000000024'));assert.equal(await adminPage.locator('a[href="tel:+919000000024"]').count(),1);assert(content.includes('Browser Referred Worker'));await adminPage.getByText('View full details',{exact:true}).first().click();assert((await adminPage.locator('main').last().innerText()).includes('Browser Referrer'));
 await admin.close();assert.deepEqual(errors,[]);
 console.log('PASS: two home links without inline forms, separate form pages, registration and referral submissions, Live-in field behavior, admin visibility and protected data');
}finally{await context.close();await browser.close();}
