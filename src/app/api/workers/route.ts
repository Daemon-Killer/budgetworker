import {getSession} from '@/lib/auth';
import {jsonError,jsonOk} from '@/lib/api';
import {searchWorkers} from '@/lib/directory';
import {withCors} from '@/lib/cors';
export async function GET(req:Request){return withCors(req,async()=>{try{const session=await getSession(req);return jsonOk(await searchWorkers(new URL(req.url).searchParams,session?.id));}catch(e){return jsonError(e);}});}
export async function OPTIONS(req:Request){return withCors(req,async()=>new Response(null,{status:204}));}
