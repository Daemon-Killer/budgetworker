import { PGlite } from '@electric-sql/pglite';
import { fromNodeSocket } from 'pg-gateway/node';
import { createServer } from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { networkInterfaces } from 'node:os';
import { startLiveKitFixture, fixtureKey, fixtureSecret, fixtureGuard } from './livekit-fixture.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const preview=process.argv.includes('--preview');
const interviews=process.argv.includes('--interviews');
const livekit=interviews?await startLiveKitFixture():null;
const db=new PGlite();await db.waitReady;
for(const name of fs.readdirSync(path.join(root,'prisma/migrations')).filter(n=>/^\d/.test(n)).sort())await db.exec(fs.readFileSync(path.join(root,'prisma/migrations',name,'migration.sql'),'utf8'));
const tcp=createServer(socket=>{socket.on('error',()=>{});fromNodeSocket(socket,{auth:{method:'trust'},async onStartup(){await db.exec('DEALLOCATE ALL');},async onMessage(data,{isAuthenticated}){if(!isAuthenticated)return;if(data[0]===88)return new Uint8Array();return (await db.execProtocol(data,{throwOnError:false})).data;}}).catch(e=>{if(e?.code!=='ECONNRESET')console.error(e);socket.destroy();});});
await new Promise(resolve=>tcp.listen(55432,'127.0.0.1',resolve));
const probe=createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=preview?3000:probe.address().port;await new Promise(resolve=>probe.close(resolve));
const env={...process.env,DATABASE_URL:'postgresql://postgres:postgres@127.0.0.1:55432/postgres?connection_limit=1&statement_cache_size=0',SESSION_SECRET:randomBytes(32).toString('hex'),OTP_MODE:'dev',DEV_OTP_CODE:'123456',PAYMENT_MODE:'mock',RAZORPAY_KEY_ID:'',RAZORPAY_KEY_SECRET:'',NEXT_PUBLIC_RAZORPAY_KEY_ID:'',ADMIN_PHONES:'9999999999',NEXT_DIST_DIR:preview?'.next-preview':'.next-test',NEXT_TELEMETRY_DISABLED:'1',BUDGETWORKER_DEV_HOSTS:preview?Object.values(networkInterfaces()).flat().filter(n=>n&&n.family==='IPv4'&&!n.internal).map(n=>n.address).join(','):'',TEST_BASE_URL:'http://127.0.0.1:'+port};
env.APP_URL=env.TEST_BASE_URL;
env.LIVEKIT_URL=livekit?livekit.url.replace('http:', 'ws:'):'';
env.LIVEKIT_API_KEY=livekit?fixtureKey:'';
env.LIVEKIT_API_SECRET=livekit?fixtureSecret:'';
env.LIVEKIT_GUARD_SECRET=livekit?fixtureGuard:'';
env.TEST_LIVEKIT_URL=livekit?.url||'';
const seedStatus=await new Promise(resolve=>{const seed=spawn(process.execPath,['tests/seed-preview.mjs'],{cwd:root,env,stdio:'inherit'});seed.on('exit',resolve);});if(seedStatus!==0)throw new Error('Local test seed failed');
// Legacy job tests explicitly opt in on this isolated database; normal previews keep jobs disabled.
if(!preview&&!interviews&&!process.argv.includes('--directory'))await db.exec(`INSERT INTO "SiteSettings" (id,"jobPostingEnabled","updatedAt") VALUES ('main',true,NOW())`);
const app=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname',preview?'0.0.0.0':'127.0.0.1','--port',String(port)],{cwd:root,env,stdio:'pipe'});let log='';app.stdout.on('data',c=>{log+=c;if(preview)process.stdout.write(c);});app.stderr.on('data',c=>{log+=c;if(preview)process.stderr.write(c);});
function stop(){if(app.pid){if(process.platform==='win32')spawnSync('taskkill',['/PID',String(app.pid),'/T','/F'],{stdio:'ignore'});else app.kill('SIGTERM');}}
process.on('SIGINT',()=>{stop();process.exit(130);});process.on('SIGTERM',()=>{stop();process.exit(143);});
try{
 let ready=false;for(let i=0;i<90;i++){try{if((await fetch(env.TEST_BASE_URL+'/api/marketplace/settings')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,1000));}
 if(!ready)throw new Error('Test server did not become ready. '+log);
 if(preview){console.log('Local preview: '+env.TEST_BASE_URL+' | Family 9876543210 | Worker 9876543211 | Admin 9999999999 | OTP 123456. Fictitious in-memory data only.');await new Promise(()=>{});}
 else {const status=await new Promise(resolve=>{const child=spawn(process.execPath,[interviews&&!process.argv.includes('--directory')?'tests/interview-flow.mjs':process.argv.includes('--directory')?'tests/directory-flow.mjs':'tests/api-flow.mjs'],{cwd:root,env,stdio:'inherit'});child.on('exit',resolve);});if(status!==0)throw new Error('Integration tests failed. '+log);if(process.argv.includes('--directory')){const payments=await new Promise(resolve=>{const child=spawn(process.execPath,['--import','tsx','tests/payment-concurrency.ts'],{cwd:root,env,stdio:'inherit'});child.on('exit',resolve);});if(payments!==0)throw new Error('Payment concurrency tests failed');}}
 if(interviews&&process.argv.includes('--directory')){const status=await new Promise(resolve=>{const child=spawn(process.execPath,['tests/interview-flow.mjs'],{cwd:root,env,stdio:'inherit'});child.on('exit',resolve);});if(status!==0)throw new Error('Interview integration tests failed. '+log);}
}finally{stop();tcp.close();livekit?.server.close();await db.close();}
