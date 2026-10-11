import {withCors} from '@/lib/cors';
import { RESUME_PLANS } from "@/lib/resume-plans";
import { jsonOk } from "@/lib/api";

async function list() {
  const packs = RESUME_PLANS;
  return jsonOk({ packs });
}

export async function GET(req:Request){return withCors(req,list);}
export async function OPTIONS(req:Request){return withCors(req,async()=>new Response(null,{status:204}));}
