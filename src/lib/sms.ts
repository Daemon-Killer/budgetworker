/**
 * SMS / OTP providers.
 * - dev: no SMS (code returned to client for testing)
 * - msg91: real India SMS via MSG91 Send OTP API
 *
 * Docs: https://docs.msg91.com/otp/sendotp
 * POST https://control.msg91.com/api/v5/otp?template_id=&mobile=&otp=&otp_expiry=
 * Header: authkey
 */

export type OtpMode = "dev" | "msg91";

export function getOtpMode(): OtpMode {
  const m = (process.env.OTP_MODE ?? "dev").toLowerCase().trim();
  if (m === "msg91") return "msg91";
  return "dev";
}

export function isMsg91Configured(): boolean {
  return Boolean(
    process.env.MSG91_AUTH_KEY?.trim() && process.env.MSG91_TEMPLATE_ID?.trim(),
  );
}

/**
 * Send OTP SMS via MSG91.
 * @param phone10 10-digit Indian mobile (no +91)
 * @param code 4–10 digit OTP we generated
 */
export async function sendOtpSms(phone10: string, code: string): Promise<void> {
  const authkey = process.env.MSG91_AUTH_KEY?.trim();
  const templateId = process.env.MSG91_TEMPLATE_ID?.trim();
  if (!authkey || !templateId) {
    throw new Error(
      "MSG91 not configured: set MSG91_AUTH_KEY and MSG91_TEMPLATE_ID",
    );
  }

  const mobile = `91${phone10}`;
  const expiryMin = process.env.MSG91_OTP_EXPIRY_MIN ?? "10";
  const url = new URL("https://control.msg91.com/api/v5/otp");
  url.searchParams.set("template_id", templateId);
  url.searchParams.set("mobile", mobile);
  url.searchParams.set("otp", code);
  url.searchParams.set("otp_expiry", expiryMin);
  // Some templates expect otp_length
  url.searchParams.set("otp_length", String(code.length));

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      authkey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  const text = await res.text();
  let body: { type?: string; message?: string; [k: string]: unknown } = {};
  try {
    body = JSON.parse(text) as typeof body;
  } catch {
    // non-JSON error page
  }

  // MSG91 often returns 200 with type: "error"
  if (!res.ok || body.type === "error") {
    const msg =
      body.message ||
      text.slice(0, 200) ||
      `MSG91 HTTP ${res.status}`;
    console.error("[MSG91 OTP]", msg);
    throw new Error(`SMS send failed: ${msg}`);
  }

  console.log(`[MSG91 OTP] sent to ${mobile} (request ok)`);
}
