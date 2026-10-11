import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const base = process.env.TEST_BASE_URL;
if (!base) throw Error('Run through npm run test:realtime to use an isolated database.');
const prefix = 'Realtime browser worker';
const name = prefix + ' Cook';
let checks = 0;
function check(condition, message) { assert.ok(condition, message); checks++; console.log('PASS:',message); }
async function login(page, phone, destination) {
  await page.goto(base+'/login?next='+encodeURIComponent(destination));
  await page.getByLabel('Mobile number',{exact:true}).fill(phone);
  await page.getByRole('button',{name:'Send OTP',exact:true}).click();
  await page.getByLabel('OTP',{exact:true}).fill('123456');
  await page.getByRole('button',{name:'Verify & continue',exact:true}).click();
  await page.waitForURL(base+destination);
}
async function save(page) {
  await page.getByRole('button',{name:'Save profile & resume',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Profile saved.'}).waitFor();
  assert.equal(await page.locator('.bw-workspace .bw-error[role="alert"]').count(),0);
}
async function edit(page, fields, status) {
  await page.locator('article').filter({has:page.getByRole('heading',{name,exact:true})})
    .getByRole('button',{name:'Edit profile / resume',exact:true}).click();
  for(const [label,value] of Object.entries(fields)) await page.getByLabel(label,{exact:true}).fill(value);
  if(status) await page.getByLabel('Directory visibility',{exact:true}).selectOption(status);
  await save(page);
}
async function pay(page, amount, detail=false) {
  await page.getByText('₹'+amount+(detail?' per month':''),{exact:true}).waitFor({timeout:10_000});
}
(async()=>{
  const browser=await chromium.launch({headless:true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),
    args:['--no-sandbox']});
  const adminContext=await browser.newContext();
  const clientContext=await browser.newContext();
  const anonymousContext=await browser.newContext();
  const admin=await adminContext.newPage(), client=await clientContext.newPage(), anonymous=await anonymousContext.newPage();
  let detail;
  const errors=[];
  for(const page of [admin,client,anonymous]) page.on('pageerror',e=>errors.push(e.message));
  try {
    await login(client,'9876543210','/workers');
    const directoryUrl=base+'/workers?city=Pune&area=Baner&q='+encodeURIComponent(prefix);
    await client.goto(directoryUrl);
    let failedConnections=0;
    await anonymous.route('**/api/workers/events',async route=>{
      failedConnections++;
      await route.fulfill({status:503,contentType:'application/json',body:'{"error":"Temporary stream outage"}'});
    },{times:1});
    await anonymous.goto(directoryUrl);
    await client.getByRole('heading',{name:'No workers match yet',exact:true}).waitFor();
    await login(admin,'9999999999','/admin/workers');
    await admin.getByRole('button',{name:'+ Add worker',exact:true}).click();
    const fields={'Worker name':name,'Phone (private)':'9000012345','City':'Pune','Area / neighbourhood':'Baner',
      'Expected pay (₹)':'8200','Hours per day':'2','Skills':'Live cooking skills','Years of experience':'6'};
    for(const [label,value] of Object.entries(fields)) await admin.getByLabel(label,{exact:true}).fill(value);
    await admin.getByLabel('Worker resume',{exact:true}).setInputFiles({name:'live.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nFictitious realtime test resume')});
    const created=admin.waitForResponse(r=>r.url()===base+'/api/admin/workers'&&r.request().method()==='POST');
    await save(admin);
    const worker=(await (await created).json()).worker;
    await client.getByRole('link',{name,exact:true}).waitFor({timeout:10_000});
    await anonymous.getByRole('link',{name,exact:true}).waitFor({timeout:10_000});
    check(true,'admin publication appears on already-open customer and anonymous pages');
    check(failedConnections===1,'event stream recovers after an HTTP failure');

    const detailContext=await browser.newContext({storageState:await clientContext.storageState()});
    detail=await detailContext.newPage();
    detail.on('pageerror',e=>errors.push(e.message));
    await detail.goto(base+'/workers/'+worker.id);
    await pay(detail,'8,200',true);
    // Leave an unapplied draft filter in the input. Live refresh must use the
    // last submitted filters and leave the user's draft input untouched.
    await client.getByLabel('City',{exact:true}).fill('Mumbai');
    await edit(admin,{'Expected pay (₹)':'9200','Skills':'Edited live cooking skills'});
    await pay(client,'9,200');
    await pay(detail,'9,200',true);
    check((await detail.locator('body').innerText()).includes('Edited live cooking skills'),'open worker detail updates without reload');
    check(await client.getByLabel('City',{exact:true}).inputValue()==='Mumbai','unsubmitted filter input is preserved');
    check(new URL(client.url()).searchParams.get('city')==='Pune','live results retain applied filters and URL');
    check(!(await client.locator('body').innerText()).includes('9000012345'),'live customer data keeps private phone hidden');

    let failedFetches=0;
    const failOnce=async route=>{
      failedFetches++;
      await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Temporary test outage'})});
    };
    await client.route('**/api/workers?*',failOnce,{times:1});
    await edit(admin,{'Expected pay (₹)':'9500'});
    await pay(client,'9,500');
    check(failedFetches===1,'failed background fetch retries without another admin change');

    await clientContext.setOffline(true);
    await edit(admin,{'Expected pay (₹)':'9700'});
    await pay(detail,'9,700',true);
    await clientContext.setOffline(false);
    await pay(client,'9,700');
    check(true,'customer catches missed changes after reconnecting');

    const extra={phone:'9000099999',category:'HOUSEKEEPING',employmentType:'PART_TIME',city:'Pune',area:'Baner',expectedPayInr:6000,payPeriod:'MONTH',hoursPerDay:2,status:'AVAILABLE'};
    for(let i=0;i<24;i++) {
      const response=await adminContext.request.post(base+'/api/admin/workers',{data:{...extra,name:prefix+' '+i}});
      assert.equal(response.status(),201);
    }
    await client.goto(directoryUrl+'&page=2');
    await client.getByRole('link',{name,exact:true}).waitFor();
    await edit(admin,{},'INACTIVE');
    await detail.getByRole('heading',{name:'This worker is currently unavailable',exact:true}).waitFor({timeout:10_000});
    await client.waitForURL(url=>url.searchParams.get('page')==='1',{timeout:10_000});
    check(await client.getByRole('link',{name,exact:true}).count()===0,'hidden worker disappears and empty final page returns to the last valid page');
    check(new URL(client.url()).searchParams.get('q')===prefix,'pagination reconciliation keeps submitted search');
    check((await detail.locator('body').innerText()).includes('Browse other available workers'),'hidden profile removes old worker details');
    const hidden=await clientContext.request.get(base+'/api/workers/'+worker.id);
    check(hidden.status()===404,'hidden worker remains protected by the public API');

    await edit(admin,{},'AVAILABLE');
    await client.getByRole('link',{name,exact:true}).waitFor({timeout:10_000});
    await detail.getByRole('heading',{name,exact:true,level:1}).waitFor({timeout:10_000});
    check(true,'republishing restores the already-open directory and profile');
    const denied=await clientContext.request.patch(base+'/api/admin/workers/'+worker.id,{data:{expectedPayInr:1}});
    check(denied.status()===403,'live updates preserve admin write restrictions');
    check(errors.length===0,'realtime browser flow has no uncaught page errors: '+errors.join('; '));
    console.log('PASS: '+checks+' realtime browser checks; customer pages required no manual reload after admin changes.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
