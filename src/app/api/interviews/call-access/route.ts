import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { interviewCallAccess } from "@/lib/interviews";
import { interviewJson } from "@/lib/interview-http";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
export async function POST(req: Request) {
  const secret = process.env.LIVEKIT_GUARD_SECRET;
  const supplied = req.headers.get("authorization") || "";
  const hash = (value: string) => createHash("sha256").update(value).digest();
  if (!secret || secret.length < 32 || supplied.length > 1000 || !timingSafeEqual(hash(supplied), hash(`Bearer ${secret}`))) return NextResponse.json({ allowed: false }, { status: 401, headers });
  try { return NextResponse.json(await interviewCallAccess(await interviewJson(req)), { headers }); }
  catch { return NextResponse.json({ allowed: false }, { status: 400, headers }); }
}
