import assert from 'node:assert/strict';import {createHmac} from 'node:crypto';import {prisma as db} from '../src/lib/db';import {verifyRazorpayPayment} from '../src/lib/payments';
if(!process.env.DATABASE_URL?.includes('127.0.0.1:55432'))throw Error('Payment fixtures require the isolated local database');
process.env.RAZORPAY_KEY_SECRET='isolated-test-signature-secret';
async function main(){const user=await db.user.findUniqueOrThrow({where:{phone:'9876543210'}}),pack=await db.pack.findFirstOrThrow({where:{active:true}});const order=await db.order.create({data:{userId:user.id,packId:pack.id,amountInr:pack.priceInr,credits:pack.credits,provider:'razorpay',providerRef:'order_fixture',status:'PENDING'}});
const input={orderId:order.id,userId:user.id,razorpayOrderId:'order_fixture',razorpayPaymentId:'pay_fixture',razorpaySignature:createHmac('sha256',process.env.RAZORPAY_KEY_SECRET!).update('order_fixture|pay_fixture').digest('hex')};
await Promise.all(Array.from({length:6},()=>verifyRazorpayPayment(input)));assert.equal(await db.creditLedger.count({where:{orderId:order.id}}),1);assert.equal((await db.order.findUniqueOrThrow({where:{id:order.id}})).status,'PAID');
await assert.rejects(()=>verifyRazorpayPayment({...input,userId:'another-user'}));
const pending=await db.order.create({data:{userId:user.id,packId:pack.id,amountInr:pack.priceInr,credits:pack.credits,provider:'razorpay',providerRef:'order_invalid',status:'PENDING'}});await assert.rejects(()=>verifyRazorpayPayment({...input,orderId:pending.id,razorpayOrderId:'order_invalid',razorpaySignature:'invalid'}));assert.equal(await db.creditLedger.count({where:{orderId:pending.id}}),0);
console.log('PASS: concurrent payment callbacks credit a wallet once; foreign orders and invalid signatures do not grant credits.');}
main().finally(()=>db.$disconnect());
