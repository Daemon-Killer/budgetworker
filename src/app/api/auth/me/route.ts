import {getSession} from '@/lib/auth';import {getCreditBalance} from '@/lib/credits';import {jsonOk} from '@/lib/api';import {withCors} from '@/lib/cors';
export async function GET(req:Request){return withCors(req,async()=>{const user=await getSession(req);return jsonOk({user,balance:user?await getCreditBalance(user.id):0});});}
export async function OPTIONS(req:Request){return withCors(req,async()=>new Response(null,{status:204}));}
