import { NextResponse } from "next/server";
import { AuthError, requireUser } from "./auth";
import { InterviewError } from "./interview-errors";

export async function requireFamily(req: Request) {
  const user = await requireUser(req);
  if (user.role !== "CLIENT") throw new AuthError("Family access is required for interviews.", 403);
  return user;
}

export function interviewAppOrigin(req: Request) {
  const configured = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  const url = new URL(configured || req.url);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  // Without explicit configuration, production links are restricted to the
  // known site. Never construct private invitations from arbitrary Host input.
  if (url.username || url.password || (url.protocol !== "https:" && !(local && process.env.NODE_ENV !== "production" && url.protocol === "http:")) || (!configured && process.env.NODE_ENV === "production" && !["budgetworker.in", "www.budgetworker.in"].includes(url.hostname))) {
    throw new InterviewError("The website address is not configured for private invitations.", 503);
  }
  return url.origin;
}

export async function interviewApi(req: Request, handler: () => Promise<unknown>) {
  const headers = new Headers({ "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" });
  try {
    const origin = req.headers.get("origin");
    if (origin) {
      const allowed = [interviewAppOrigin(req), new URL(req.url).origin, ...(process.env.MOBILE_WEB_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean)];
      if (!allowed.includes(origin)) throw new InterviewError("Origin not allowed", 403);
      headers.set("Access-Control-Allow-Origin", origin);
      headers.set("Vary", "Origin");
      headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
      headers.set("Access-Control-Allow-Headers", "Content-Type,Authorization");
    }
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
    return NextResponse.json(await handler(), { headers });
  } catch (error) {
    if (error instanceof InterviewError || error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    // These routes handle secrets in URLs and provider responses. Do not log raw
    // errors, requests, tokens or invitation URLs.
    return NextResponse.json({ error: "Interview service is temporarily unavailable. Please try again." }, { status: 500, headers });
  }
}

export async function interviewJson(req: Request) {
  if (!req.headers.get("content-type")?.toLowerCase().includes("application/json")) throw new InterviewError("Send interview details as JSON.", 400);
  const length = Number(req.headers.get("content-length") || 0);
  if (length > 12000) throw new InterviewError("Interview details are too long.", 413);
  const text = await req.text();
  if (text.length > 12000) throw new InterviewError("Interview details are too long.", 413);
  try { return JSON.parse(text) as unknown; }
  catch { throw new InterviewError("Invalid interview details.", 400); }
}
