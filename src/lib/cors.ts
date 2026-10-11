import { NextResponse } from "next/server";
export async function withCors(req: Request, handler: () => Promise<Response>) {
  const origin = req.headers.get("origin");
  const mobileOrigins = (
    process.env.MOBILE_WEB_ORIGINS ??
    (process.env.NODE_ENV === "development"
      ? "http://localhost:8081,http://127.0.0.1:8081"
      : "")
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const workerOrigins = (
    process.env.WORKER_WEB_ORIGINS ||
    (process.env.NODE_ENV === "development"
      ? "http://localhost:3001,http://127.0.0.1:3001"
      : "")
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const configured = [...mobileOrigins, ...workerOrigins];
  const url = new URL(req.url);
  const same = url.protocol + "//" + (req.headers.get("host") ?? url.host);
  const publicOrigin = process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL).origin
    : null;
  const allowed =
    !origin ||
    origin === same ||
    origin === publicOrigin ||
    configured.includes(origin);
  if (!allowed)
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
  const res =
    req.method === "OPTIONS"
      ? new Response(null, { status: 204 })
      : await handler();
  if (origin) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Vary", "Origin");
    res.headers.set(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    );
    res.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type,Authorization",
    );
  }
  res.headers.set("Cache-Control", "no-store");
  return res;
}
