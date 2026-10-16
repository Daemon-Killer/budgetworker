import { isValidPhone, normalizePhone } from "./phone";

type Environment = Record<string, string | undefined>;
const list = (value?: string) => new Set((value ?? "").split(",").map((p) => normalizePhone(p.trim())).filter(Boolean));
function fail(message: string, status: number): never {
  throw Object.assign(new Error(message), { status });
}

/** Production testing requires an explicit phone allowlist. */
export function devLogin(phone: string, env: Environment = process.env) {
  if (env.NODE_ENV !== "production") return { code: env.DEV_OTP_CODE ?? "123456", reveal: true, admin: false };
  if (env.ALLOW_PRODUCTION_DEV_OTP !== "true") fail("Test login is not enabled on this server", 503);
  const code = env.DEV_OTP_CODE ?? "";
  if (!/^\d{8,10}$/.test(code) || /^(\d)\1+$/.test(code) || code === "12345678") fail("Private test login code is not configured", 503);
  const allowed = list(env.DEV_OTP_PHONES);
  const admins = list(env.TEST_ADMIN_PHONES);
  if (!allowed.size || [...admins].some((p) => !allowed.has(p))) fail("Approved test phones are not configured", 503);
  if (!allowed.has(phone)) fail("Testing is limited to approved mobile numbers. Contact the site owner for access.", 403);
  return { code, reveal: env.SHOW_TEST_OTP === "true", admin: admins.has(phone) };
}

/** Read-only hint: never issues a challenge or sends an SMS. */
export function testOtpHint(rawPhone: string, env: Environment = process.env): string | null {
  if (env.SHOW_TEST_OTP !== "true" || (env.OTP_MODE ?? "dev").toLowerCase().trim() !== "dev") return null;
  const phone = normalizePhone(rawPhone);
  if (!isValidPhone(phone)) return null;
  try {
    const test = devLogin(phone, env);
    return test.reveal ? test.code : null;
  } catch {
    return null;
  }
}
