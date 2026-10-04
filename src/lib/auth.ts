import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./db";
import { normalizePhone, isValidPhone } from "./phone";
import { ROLES } from "./constants";
import { getOtpMode, isMsg91Configured, sendOtpSms } from "./sms";
import { devLogin } from "./test-login";

const COOKIE = "hh_session";
const OTP_TTL_MS = 10 * 60 * 1000;
/** Max OTP requests per phone in the last hour */
const OTP_MAX_PER_PHONE_HOUR = Number(
  process.env.OTP_MAX_PER_PHONE_HOUR ?? "5",
);
// Private test codes do not send SMS. Bound new challenges while allowing resends.
const TEST_OTP_MAX_PER_PHONE_HOUR = 30;

function secretKey() {
  const configured = process.env.SESSION_SECRET;
  if (
    process.env.NODE_ENV === "production" &&
    (!configured || configured.length < 32)
  )
    throw new AuthError("Session service is not configured", 503);
  const s = configured ?? "dev-insecure-secret";
  return new TextEncoder().encode(s);
}

export type SessionUser = {
  id: string;
  phone: string;
  name: string | null;
  role: string;
};

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    sub: user.id,
    phone: user.phone,
    name: user.name,
    role: user.role,
    version:
      (
        await prisma.user.findUnique({
          where: { id: user.id },
          select: { sessionVersion: true },
        })
      )?.sessionVersion ?? 0,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSession(req?: Request): Promise<SessionUser | null> {
  const header = req?.headers.get("authorization");
  const token = header
    ? header.startsWith("Bearer ")
      ? header.slice(7)
      : undefined
    : (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub || typeof payload.phone !== "string") return null;
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || (payload.version ?? 0) !== user.sessionVersion) return null;
    return { id: user.id, phone: user.phone, name: user.name, role: user.role };
  } catch {
    return null;
  }
}

export async function requireUser(req?: Request): Promise<SessionUser> {
  const user = await getSession(req);
  if (!user) throw new AuthError("Login required");
  return user;
}

export async function requireAdmin(req?: Request): Promise<SessionUser> {
  const user = await requireUser(req);
  if (user.role !== ROLES.ADMIN) throw new AuthError("Admin only", 403);
  return user;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

function adminPhones(): Set<string> {
  return new Set(
    (process.env.ADMIN_PHONES ?? "")
      .split(",")
      .map((p) => normalizePhone(p.trim()))
      .filter(Boolean),
  );
}

async function assertOtpRateLimit(phone: string) {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const count = await prisma.otpCode.count({
    where: { phone, createdAt: { gte: since } },
  });
  if (count >= OTP_MAX_PER_PHONE_HOUR) {
    throw new AuthError(
      "Too many OTP requests. Try again after some time.",
      429,
    );
  }
}

async function requestTestChallenge(phone: string, code: string) {
  for (let retry = 0; ; retry++) {
    try {
      await prisma.$transaction(async (tx) => {
        const now = new Date();
        const active = await tx.otpCode.findFirst({
          where: { phone, code, consumed: false, expiresAt: { gt: now } },
          orderBy: { createdAt: "desc" },
        });
        // Resends preserve expiry and incorrect attempts, including locked challenges.
        if (active) return;
        const count = await tx.otpCode.count({
          where: { phone, code, createdAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) } },
        });
        if (count >= TEST_OTP_MAX_PER_PHONE_HOUR) {
          throw new AuthError("Too many test logins. Try again in an hour.", 429);
        }
        await tx.otpCode.create({
          data: { phone, code, expiresAt: new Date(now.getTime() + OTP_TTL_MS) },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && retry < 3) continue;
      throw error;
    }
  }
}

/**
 * Request login OTP.
 * - dev: local code displayed; production testing keeps the code private and restricts phones
 * - msg91: random code SMS'd; never returned to client
 */
export async function requestOtp(
  rawPhone: string,
): Promise<{ ok: true; mode: string; devCode?: string }> {
  const phone = normalizePhone(rawPhone);
  if (!isValidPhone(phone)) {
    throw new AuthError("Enter a valid 10-digit Indian mobile number", 400);
  }

  const mode = getOtpMode();
  const test = mode === "dev" ? devLogin(phone) : null;
  if (test) {
    await requestTestChallenge(phone, test.code);
    console.log("[OTP test] login requested", { phoneEnding: phone.slice(-4), codeDisplayed: test.reveal });
    return { ok: true, mode: "dev", ...(test.reveal ? { devCode: test.code } : {}) };
  }

  await assertOtpRateLimit(phone);
  const code = String(randomInt(100000, 1000000));

  await prisma.otpCode.create({
    data: {
      phone,
      code,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  // msg91
  if (!isMsg91Configured()) {
    throw new AuthError(
      "SMS not configured on server (MSG91_AUTH_KEY / MSG91_TEMPLATE_ID)",
      503,
    );
  }

  try {
    await sendOtpSms(phone, code);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "SMS failed";
    throw new AuthError(msg, 502);
  }

  return { ok: true, mode: "msg91" };
}

export async function verifyOtp(
  rawPhone: string,
  code: string,
  name?: string,
  native = false,
) {
  const phone = normalizePhone(rawPhone);
  if (!isValidPhone(phone)) {
    throw new AuthError("Enter a valid 10-digit Indian mobile number", 400);
  }

  const test = getOtpMode() === "dev" ? devLogin(phone) : null;

  const otp = await prisma.otpCode.findFirst({
    where: {
      phone,
      ...(test ? { code: test.code } : {}),
      consumed: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (otp && otp.attempts >= 5)
    throw new AuthError(
      test ? "Too many incorrect attempts. Try again in 10 minutes." : "Too many incorrect attempts. Request a new code.",
      429,
    );
  if (!otp || otp.code !== code.trim()) {
    if (otp) {
      const attempted = await prisma.otpCode.updateMany({
        where: { id: otp.id, consumed: false, attempts: { lt: 5 } },
        data: { attempts: { increment: 1 } },
      });
      if (attempted.count !== 1) throw new AuthError("Code already used or attempt limit reached", 429);
    }
    throw new AuthError("Invalid or expired OTP", 400);
  }

  const consumed = await prisma.otpCode.updateMany({
    where: { id: otp.id, consumed: false, attempts: { lt: 5 } },
    data: { consumed: true },
  });
  if (consumed.count !== 1) throw new AuthError("Code already used", 400);

  const isAdmin = adminPhones().has(phone) || Boolean(test?.admin);
  const user = await prisma.user.upsert({
    where: { phone },
    create: {
      phone,
      name: name?.trim() || null,
      role: isAdmin ? ROLES.ADMIN : ROLES.CLIENT,
    },
    update: {
      ...(name?.trim() ? { name: name.trim() } : {}),
      role: isAdmin ? ROLES.ADMIN : undefined,
    },
  });

  if (isAdmin && user.role !== ROLES.ADMIN) {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: ROLES.ADMIN },
    });
    user.role = ROLES.ADMIN;
  }

  const session: SessionUser = {
    id: user.id,
    phone: user.phone,
    name: user.name,
    role: user.role,
  };

  const token = await createSessionToken(session);
  if (!native) await setSessionCookie(token);
  return session;
}
