import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
import {gunzipSync} from 'node:zlib';

// Input is a locally prepared export, never a public asset or committed dataset.
const file = process.argv[2];
if (!file) throw Error('Usage: node scripts/import-workers.mjs private-import.json [--apply]');
const contents = fs.readFileSync(file, 'utf8');
const input = JSON.parse(file.endsWith('.gz.b64') ? gunzipSync(Buffer.from(contents, 'base64')).toString('utf8') : contents);
if (!/^[a-f0-9]{64}$/.test(input.sourceHash) || !Array.isArray(input.records)) throw Error('Invalid import format');
const grouped = new Map();
for (const row of input.records) {
  if (!/^[6-9]\d{9}$/.test(row.phone)) throw Error('Invalid normalized phone');
  const group = grouped.get(row.phone) || [];
  group.push(row); grouped.set(row.phone, group);
}
const prisma = new PrismaClient();
try {
  const existing = new Set((await prisma.worker.findMany({select:{phone:true}})).map(w=>{
    let phone=w.phone.replace(/\D/g,'');
    if(phone.length===12&&phone.startsWith('91'))phone=phone.slice(2);
    if(phone.length===11&&phone.startsWith('0'))phone=phone.slice(1);
    return phone;
  }));
  const candidates=[]; let existingPhones=0, underagePhones=0;
  for (const [phone, rows] of grouped) {
    if (rows.some(r=>r.sourceAge !== null && r.sourceAge < 18)) {underagePhones++;continue;}
    if (existing.has(phone)) {existingPhones++;continue;}
    const r=rows[0];
    const id='imp_'+createHash('sha256').update(input.sourceHash+':'+phone).digest('hex').slice(0,28);
    candidates.push({id,name:r.name,phone,city:r.city,area:r.area,age:r.age,
      qualification:r.qualification,englishLanguage:r.englishLanguage,
      experienceYears:r.experienceLevel==='Fresher'?0:null,
      category:'UNASSIGNED',employmentType:'UNASSIGNED',status:'INACTIVE',onboardingStatus:'PENDING',
      internalNotes:JSON.stringify({source:'worker-spreadsheet-import',sourceHash:input.sourceHash,experienceLevel:r.experienceLevel,reviewRequired:['Type of help','Work arrangement','Experience years','Source details'],duplicateSourceRows:rows.length,sourceRows:rows.map(x=>({row:x.row,original:x.original}))})});
  }
  const summary={sourceRows:input.records.length,uniquePhones:grouped.size,duplicateRows:input.records.length-grouped.size,existingPhones,underagePhones,candidates:candidates.length};
  console.log('Worker import review:',JSON.stringify(summary));
  if (process.argv.includes('--apply')) {
    let inserted=0;
    for(let start=0;start<candidates.length;start+=200) inserted+=(await prisma.worker.createMany({data:candidates.slice(start,start+200),skipDuplicates:true})).count;
    console.log('Worker import complete:',JSON.stringify({...summary,inserted,sourceRecordsVerified:await prisma.worker.count({where:{id:{in:candidates.map(r=>r.id)}}})}));
  }
} finally {await prisma.$disconnect();}
