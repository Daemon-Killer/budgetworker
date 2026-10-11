import { NextResponse } from "next/server";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { consumeInterviewBrowserTicket } from "@/lib/interviews";
import { interviewAppOrigin } from "@/lib/interview-http";

export const runtime = "nodejs";
export async function GET(req: Request) {
  const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" };
  try {
    const origin = interviewAppOrigin(req);
    const ticket = new URL(req.url).searchParams.get("ticket") || "";
    const result = await consumeInterviewBrowserTicket(ticket);
    await setSessionCookie(await createSessionToken(result.user));
    const response = NextResponse.redirect(new URL(`/interviews/${encodeURIComponent(result.interviewId)}`, origin), 303);
    for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
    return response;
  } catch {
    return new Response("This private sign-in link has expired or was already used. Please open the interview again from the Budget Worker app.", { status: 401, headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" } });
  }
}
