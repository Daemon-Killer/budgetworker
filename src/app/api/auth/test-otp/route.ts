import { testOtpHint } from "@/lib/test-login";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const phone = typeof body?.phone === "string" ? body.phone : "";
  return Response.json(
    { devCode: testOtpHint(phone) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
