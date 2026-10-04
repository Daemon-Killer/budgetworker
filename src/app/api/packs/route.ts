import {withCors} from '@/lib/cors';
import { prisma } from "@/lib/db";
import { jsonOk } from "@/lib/api";

async function list() {
  const packs = await prisma.pack.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });
  return jsonOk({ packs });
}

export async function GET(req:Request){return withCors(req,list);}
export async function OPTIONS(req:Request){return withCors(req,async()=>new Response(null,{status:204}));}
