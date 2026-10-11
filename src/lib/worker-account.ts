import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "./db";
import { AuthError, type SessionUser } from "./auth";
import { EMPLOYMENT_TYPES } from "./constants";
import { CATEGORIES } from "../../shared/marketplace";

export const ownWorkerSelect = {
  id: true, name: true, phone: true, category: true, employmentType: true,
  city: true, area: true, about: true, skill: true, experienceYears: true,
  expectedPayInr: true, payPeriod: true, hoursPerDay: true, whenCanJoin: true,
  status: true, onboardingStatus: true,
} satisfies Prisma.WorkerSelect;

const optionalNumber = (min: number, max: number, integer = false) => z.preprocess(
  v => v === "" || v === null || v === undefined ? null : v,
  (integer ? z.number().int() : z.number()).min(min).max(max).nullable(),
);
const profileInput = z.object({
  name: z.string().trim().min(2).max(100), category: z.enum(CATEGORIES),
  employmentType: z.enum(EMPLOYMENT_TYPES), city: z.string().trim().min(2).max(100),
  area: z.string().trim().max(100), about: z.string().trim().max(2000),
  skill: z.string().trim().max(1000), whenCanJoin: z.string().trim().max(100),
  experienceYears: optionalNumber(0, 80, true), expectedPayInr: optionalNumber(1, 1000000, true),
  hoursPerDay: optionalNumber(0.5, 24), payPeriod: z.enum(["MONTH", "DAY", "HOUR"]),
  status: z.enum(["AVAILABLE", "INACTIVE"]),
}).strict();

export async function saveOwnWorker(user: SessionUser, input: unknown) {
  if (user.role === "ADMIN") throw new AuthError("Use a worker phone number to register.", 403);
  const parsed = profileInput.safeParse(input);
  if (!parsed.success) throw new AuthError(parsed.error.issues[0].message, 400);
  return prisma.$transaction(async tx => {
    // Serialize first registrations and updates for the same account.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${user.id} FOR UPDATE`;
    const existing = await tx.worker.findUnique({ where: { userId: user.id } });
    if (!existing && await tx.worker.findFirst({ where: { phone: user.phone } })) {
      throw new AuthError("A profile already uses this phone. Ask the BudgetWorker team to link it to your account.", 409);
    }
    const data = parsed.data;
    if (existing?.status === "PLACED" && data.status === "AVAILABLE") {
      throw new AuthError("Ask the team to update your placement before becoming available again.", 409);
    }
    const worker = existing
      ? await tx.worker.update({ where: { id: existing.id }, data: { ...data, status: existing.status === "PLACED" ? "PLACED" : data.status }, select: ownWorkerSelect })
      : await tx.worker.create({ data: { ...data, phone: user.phone, userId: user.id, onboardingStatus: "PENDING" }, select: ownWorkerSelect });
    await tx.user.update({ where: { id: user.id }, data: { name: data.name } });
    return worker;
  });
}

export async function ownWorkerAccount(user: SessionUser) {
  const profile = await prisma.worker.findUnique({ where: { userId: user.id }, select: ownWorkerSelect });
  const invitations = profile ? await prisma.interview.findMany({
    where: { workerId: profile.id }, orderBy: { createdAt: "desc" }, take: 100,
    select: { id: true, status: true, proposedSlots: true, scheduledAt: true,
      durationMinutes: true, duties: true, schedule: true, meetingArea: true,
      expectedPayInr: true, user: { select: { name: true } } },
  }) : [];
  return { profile, invitations: invitations.map(({ user: family, ...invitation }) => ({ ...invitation, familyName: family.name || "Family" })) };
}
