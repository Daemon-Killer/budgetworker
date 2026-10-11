import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "./db";
import type { SessionUser } from "./auth";
import { InterviewError } from "./interview-errors";
import { callsConfigured, dailyMeetingToken, ensureDailyRoom, revokeDailyRoom } from "./interview-daily";
import { INTERVIEW_DURATION_MINUTES, INTERVIEW_JOIN_EARLY_MINUTES, INTERVIEW_JOIN_END_MINUTES, INTERVIEW_OUTCOMES, type AdminInterviewView, type InterviewJoin, type InterviewView } from "../../shared/interviews";

// Coordination never needs uploaded resume bytes. Keep list queries small and
// avoid pulling protected documents into either participant's booking flow.
const include = {
  worker: { select: { id: true, name: true, phone: true, category: true, city: true, area: true, status: true, onboardingStatus: true } },
  user: { select: { id: true, name: true, phone: true, role: true } },
} satisfies Prisma.InterviewInclude;
type InterviewRow = Prisma.InterviewGetPayload<{ include: typeof include }>;
type Tx = Prisma.TransactionClient;
const MINUTE = 60_000;
const slotsSchema = z.array(z.iso.datetime({ offset: true })).min(1).max(3);
const requestSchema = z.object({
  workerId: z.string().min(1).max(100),
  proposedSlots: slotsSchema,
  duties: z.string().trim().min(5).max(1200),
  schedule: z.string().trim().min(2).max(300),
  meetingArea: z.string().trim().min(2).max(200),
  expectedPayInr: z.number().int().min(0).max(1_000_000).nullable().optional(),
}).strict();
const familyMutationSchema = z.object({
  action: z.enum(["CANCEL", "RESCHEDULE", "OUTCOME"]),
  version: z.number().int().positive(),
  proposedSlots: slotsSchema.optional(),
  outcome: z.enum(INTERVIEW_OUTCOMES).optional(),
}).strict();
const adminMutationSchema = z.object({
  action: z.enum(["CONFIRM", "CANCEL", "RETRY", "COMPLETE", "NO_SHOW"]),
  version: z.number().int().positive(),
  scheduledAt: z.iso.datetime({ offset: true }).optional(),
}).strict();

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new InterviewError(result.error.issues[0]?.message || "Invalid interview details.");
  return result.data;
}

function futureSlot(value: string) {
  const date = new Date(value);
  const now = Date.now();
  if (date.getTime() <= now + 5 * MINUTE) throw new InterviewError("Choose an interview time at least five minutes from now.");
  if (date.getTime() > now + 30 * 24 * 60 * MINUTE) throw new InterviewError("Choose an interview time within the next 30 days.");
  return date;
}

function proposedSlots(values: string[]) {
  const slots = values.map((value) => futureSlot(value).toISOString()).sort();
  if (new Set(slots).size !== slots.length) throw new InterviewError("Choose different proposed interview times.");
  return slots;
}

export function toInterviewView(row: InterviewRow): InterviewView {
  return {
    id: row.id, workerId: row.workerId, workerName: row.worker.name,
    category: row.worker.category, city: row.worker.city, area: row.worker.area,
    status: row.status as InterviewView["status"],
    proposedSlots: Array.isArray(row.proposedSlots) ? row.proposedSlots.filter((value): value is string => typeof value === "string") : [],
    scheduledAt: row.scheduledAt?.toISOString() || null,
    durationMinutes: row.durationMinutes, duties: row.duties, schedule: row.schedule,
    meetingArea: row.meetingArea, expectedPayInr: row.expectedPayInr,
    outcome: row.outcome as InterviewView["outcome"],
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), version: row.version,
  };
}

function toAdminView(row: InterviewRow): AdminInterviewView {
  return { ...toInterviewView(row), familyName: row.user.name || "Family", familyPhone: row.user.phone, workerPhone: row.worker.phone };
}

async function serial<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  for (let retry = 0; ; retry++) {
    try {
      return await prisma.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10_000, timeout: 40_000 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2002"].includes(error.code) && retry < 3) continue;
      throw error;
    }
  }
}

async function locked(tx: Tx, id: string) {
  await tx.$queryRaw`SELECT id FROM "Interview" WHERE id=${id} FOR UPDATE`;
  const row = await tx.interview.findUnique({ where: { id }, include });
  if (!row) throw new InterviewError("Interview not found.", 404);
  return row;
}

function owned(row: InterviewRow, userId: string) {
  if (row.userId !== userId) throw new InterviewError("Interview not found.", 404);
}

function current(row: InterviewRow, version: number) {
  if (row.version !== version) throw new InterviewError("This interview has changed. Refresh it before trying again.", 409);
}

function available(row: InterviewRow) {
  if (row.worker.status !== "AVAILABLE" || row.worker.onboardingStatus !== "APPROVED") throw new InterviewError("This worker is not currently available for interviews.", 409);
}

function notCompleted(row: InterviewRow) {
  if (row.completedAt || row.status === "COMPLETED") throw new InterviewError("The included interview for this worker has already been completed.", 409);
}

function participantIds(row: InterviewRow) { return [`family-${row.userId}`, `worker-${row.workerId}`]; }

async function closeRoom(row: InterviewRow) {
  if (row.roomName) await revokeDailyRoom(row.roomName, participantIds(row));
}

const clearAccess = {
  inviteHash: null, inviteExpiresAt: null, roomName: null, roomUrl: null,
  familyJoinedAt: null, workerJoinedAt: null,
};

async function audit(tx: Tx, actorId: string, action: string, interviewId: string, details: string) {
  await tx.auditEntry.create({ data: { actorId, action, targetId: interviewId, details } });
}

export async function listFamilyInterviews(userId: string) {
  const rows = await prisma.interview.findMany({ where: { userId }, include, orderBy: { createdAt: "desc" } });
  return { interviews: rows.map(toInterviewView), callsConfigured: callsConfigured() };
}

export async function listAdminInterviews() {
  const rows = await prisma.interview.findMany({ include, orderBy: { updatedAt: "desc" }, take: 500 });
  return { interviews: rows.map(toAdminView), callsConfigured: callsConfigured() };
}

export async function interviewEligibility(userId: string, workerId: string) {
  if (!workerId || workerId.length > 100) throw new InterviewError("Choose a worker.");
  const unlock = await prisma.unlock.findUnique({ where: { userId_workerId: { userId, workerId } }, include: { interview: { include } } });
  return { unlocked: Boolean(unlock), interview: unlock?.interview ? toInterviewView(unlock.interview) : null, callsConfigured: callsConfigured() };
}

export async function requestInterview(user: SessionUser, input: unknown) {
  if (user.role !== "CLIENT") throw new InterviewError("Family access is required for interviews.", 403);
  const data = parse(requestSchema, input);
  return serial(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${user.id} FOR UPDATE`;
    const unlock = await tx.unlock.findUnique({ where: { userId_workerId: { userId: user.id, workerId: data.workerId } }, include: { interview: { include }, worker: { select: { status: true, onboardingStatus: true } } } });
    if (!unlock) throw new InterviewError("Unlock this worker's resume to use the included interview.", 402);
    // Duplicate submissions are idempotent, including a historical completion.
    if (unlock.interview) return { interview: toInterviewView(unlock.interview) };
    if (unlock.worker.status !== "AVAILABLE" || unlock.worker.onboardingStatus !== "APPROVED") throw new InterviewError("This worker is not currently available for interviews.", 409);
    const row = await tx.interview.create({ data: {
      unlockId: unlock.id, userId: user.id, workerId: unlock.workerId,
      proposedSlots: proposedSlots(data.proposedSlots), duties: data.duties,
      schedule: data.schedule, meetingArea: data.meetingArea,
      expectedPayInr: data.expectedPayInr ?? null,
      durationMinutes: INTERVIEW_DURATION_MINUTES,
    }, include });
    await audit(tx, user.id, "INTERVIEW_REQUEST", row.id, "Requested the interview included with this resume unlock.");
    return { interview: toInterviewView(row) };
  });
}

export async function mutateFamilyInterview(userId: string, id: string, input: unknown) {
  const data = parse(familyMutationSchema, input);
  return serial(async (tx) => {
    const row = await locked(tx, id);
    owned(row, userId); current(row, data.version);
    let update: Prisma.InterviewUpdateInput;
    if (data.action === "OUTCOME") {
      if (row.status !== "COMPLETED" || !data.outcome) throw new InterviewError("Save an outcome after your interview is completed.", 409);
      update = { outcome: data.outcome };
    } else {
      notCompleted(row);
      if (data.action === "CANCEL") {
        if (!["REQUESTED", "SCHEDULED", "CONFIRMED"].includes(row.status)) throw new InterviewError("This interview cannot be cancelled in its current state.", 409);
        await closeRoom(row);
        update = { ...clearAccess, status: "CANCELLED" };
      } else {
        available(row);
        if (!data.proposedSlots) throw new InterviewError("Choose new proposed times.");
        const slots = proposedSlots(data.proposedSlots);
        await closeRoom(row);
        update = { ...clearAccess, status: "REQUESTED", scheduledAt: null, proposedSlots: slots, roomGeneration: { increment: 1 } };
      }
    }
    const updated = await tx.interview.update({ where: { id }, data: { ...update, version: { increment: 1 } }, include });
    await tx.interviewBrowserTicket.updateMany({ where: { interviewId: id, consumed: false }, data: { consumed: true } });
    await audit(tx, userId, `INTERVIEW_${data.action}`, id, "Family updated the interview.");
    return { interview: toInterviewView(updated) };
  });
}

async function checkConflicts(tx: Tx, row: InterviewRow, startsAt: Date) {
  // Reserve the complete allowed call window so two bookings cannot compete
  // for a family's or worker's microphone while the earlier room is still open.
  await tx.$queryRaw`SELECT id FROM "User" WHERE id=${row.userId} FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM "Worker" WHERE id=${row.workerId} FOR UPDATE`;
  const gap = (INTERVIEW_JOIN_EARLY_MINUTES + INTERVIEW_JOIN_END_MINUTES) * MINUTE;
  const clash = await tx.interview.findFirst({ where: {
    id: { not: row.id }, status: { in: ["SCHEDULED", "CONFIRMED"] },
    OR: [{ userId: row.userId }, { workerId: row.workerId }],
    scheduledAt: { gt: new Date(startsAt.getTime() - gap), lt: new Date(startsAt.getTime() + gap) },
  } });
  if (clash) throw new InterviewError("The family or worker already has an interview around that time. Choose a time at least 40 minutes apart.", 409);
}

export async function mutateAdminInterview(actorId: string, id: string, input: unknown, appOrigin: string) {
  const data = parse(adminMutationSchema, input);
  return serial(async (tx) => {
    const row = await locked(tx, id);
    current(row, data.version); notCompleted(row);
    let update: Prisma.InterviewUpdateInput;
    let workerInviteUrl: string | undefined;
    if (data.action === "CONFIRM") {
      available(row);
      if (!["REQUESTED", "SCHEDULED", "CONFIRMED"].includes(row.status)) throw new InterviewError("Retry this interview before scheduling it.", 409);
      if (!data.scheduledAt) throw new InterviewError("Choose the agreed interview time.");
      const startsAt = futureSlot(data.scheduledAt);
      await checkConflicts(tx, row, startsAt);
      await closeRoom(row);
      const invite = randomBytes(32).toString("base64url");
      update = {
        ...clearAccess, status: "SCHEDULED", scheduledAt: startsAt,
        inviteHash: createHash("sha256").update(invite).digest("hex"),
        inviteExpiresAt: new Date(startsAt.getTime() + INTERVIEW_JOIN_END_MINUTES * MINUTE),
        roomGeneration: { increment: 1 },
      };
      workerInviteUrl = `${appOrigin}/interviews/invite/${encodeURIComponent(invite)}`;
    } else if (data.action === "RETRY") {
      if (!["CANCELLED", "NO_SHOW"].includes(row.status)) throw new InterviewError("Only cancelled or missed interviews need a retry.", 409);
      available(row); await closeRoom(row);
      update = { ...clearAccess, status: "REQUESTED", scheduledAt: null, roomGeneration: { increment: 1 } };
    } else if (data.action === "COMPLETE") {
      if (row.status !== "CONFIRMED" || !row.scheduledAt || row.scheduledAt.getTime() > Date.now()) throw new InterviewError("Only a confirmed interview that has started can be completed.", 409);
      if (!row.familyJoinedAt || !row.workerJoinedAt) throw new InterviewError("Both participants must have opened the call before you can mark it completed.", 409);
      await closeRoom(row);
      update = { inviteHash: null, inviteExpiresAt: null, roomName: null, roomUrl: null, status: "COMPLETED", completedAt: new Date() };
    } else if (data.action === "NO_SHOW") {
      if (!["SCHEDULED", "CONFIRMED"].includes(row.status) || !row.scheduledAt || row.scheduledAt.getTime() + INTERVIEW_JOIN_END_MINUTES * MINUTE > Date.now()) throw new InterviewError("Mark a no-show after the interview join window has ended.", 409);
      await closeRoom(row);
      update = { ...clearAccess, status: "NO_SHOW" };
    } else {
      if (!["REQUESTED", "SCHEDULED", "CONFIRMED"].includes(row.status)) throw new InterviewError("This interview cannot be cancelled in its current state.", 409);
      await closeRoom(row);
      update = { ...clearAccess, status: "CANCELLED" };
    }
    const updated = await tx.interview.update({ where: { id }, data: { ...update, version: { increment: 1 } }, include });
    await tx.interviewBrowserTicket.updateMany({ where: { interviewId: id, consumed: false }, data: { consumed: true } });
    await audit(tx, actorId, `INTERVIEW_ADMIN_${data.action}`, id, data.action === "COMPLETE" ? "Admin confirmed the interview was completed; the included allowance is consumed." : "Admin updated interview coordination.");
    return { interview: toAdminView(updated), ...(workerInviteUrl ? { workerInviteUrl } : {}) };
  });
}

function validInvite(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new InterviewError("This invitation is invalid or has expired.", 404);
  return createHash("sha256").update(token).digest("hex");
}

function inviteOpen(row: InterviewRow) {
  if (!row.inviteExpiresAt || row.inviteExpiresAt.getTime() <= Date.now() || !["SCHEDULED", "CONFIRMED"].includes(row.status)) throw new InterviewError("This invitation is invalid or has expired.", 404);
}

export async function getInterviewInvite(token: string) {
  const row = await prisma.interview.findUnique({ where: { inviteHash: validInvite(token) }, include });
  if (!row) throw new InterviewError("This invitation is invalid or has expired.", 404);
  inviteOpen(row);
  return { interview: toInterviewView(row), callsConfigured: callsConfigured() };
}

export async function respondInterviewInvite(token: string, input: unknown) {
  const data = parse(z.object({ action: z.enum(["ACCEPT", "DECLINE", "JOIN"]) }).strict(), input);
  const hash = validInvite(token);
  return serial(async (tx) => {
    const initial = await tx.interview.findUnique({ where: { inviteHash: hash }, select: { id: true } });
    if (!initial) throw new InterviewError("This invitation is invalid or has expired.", 404);
    const row = await locked(tx, initial.id);
    if (row.inviteHash !== hash) throw new InterviewError("This invitation has changed. Ask Budget Worker for a new link.", 404);
    inviteOpen(row);
    if (data.action === "JOIN") return joinLocked(tx, row, "worker");
    if (data.action === "ACCEPT" && row.status === "CONFIRMED") return { interview: toInterviewView(row) };
    if (data.action === "ACCEPT" && row.status !== "SCHEDULED") throw new InterviewError("This interview has already been confirmed.", 409);
    if (data.action === "ACCEPT") {
      available(row);
      const updated = await tx.interview.update({ where: { id: row.id }, data: { status: "CONFIRMED", version: { increment: 1 } }, include });
      return { interview: toInterviewView(updated) };
    }
    await closeRoom(row);
    const updated = await tx.interview.update({ where: { id: row.id }, data: { ...clearAccess, status: "REQUESTED", scheduledAt: null, version: { increment: 1 }, roomGeneration: { increment: 1 } }, include });
    await tx.interviewBrowserTicket.updateMany({ where: { interviewId: row.id, consumed: false }, data: { consumed: true } });
    return { interview: toInterviewView(updated) };
  });
}

function safeDisplayName(name: string | null, fallback: string) {
  // Account names can be user-entered; never propagate phone/email identifiers
  // into the provider's participant list.
  return name && !/[\d@+]/.test(name) ? name.trim().slice(0, 60) || fallback : fallback;
}

async function joinLocked(tx: Tx, row: InterviewRow, side: "family" | "worker"): Promise<InterviewJoin> {
  if (row.status !== "CONFIRMED" || !row.scheduledAt) throw new InterviewError("The worker must confirm this interview before either participant can join.", 409);
  available(row);
  const opensAt = new Date(row.scheduledAt.getTime() - INTERVIEW_JOIN_EARLY_MINUTES * MINUTE);
  const endsAt = new Date(row.scheduledAt.getTime() + INTERVIEW_JOIN_END_MINUTES * MINUTE);
  if (Date.now() < opensAt.getTime()) throw new InterviewError("Your call opens ten minutes before the scheduled interview.", 409);
  if (Date.now() >= endsAt.getTime()) throw new InterviewError("This interview's join window has ended. Ask Budget Worker to arrange a retry.", 409);
  const name = row.roomName || `bw-${row.id}-${row.roomGeneration}`;
  const url = await ensureDailyRoom(name, opensAt, endsAt);
  const displayName = side === "family" ? safeDisplayName(row.user.name, "Family") : safeDisplayName(row.worker.name, "Worker");
  const identity = side === "family" ? `family-${row.userId}` : `worker-${row.workerId}`;
  const token = await dailyMeetingToken(name, identity, displayName, endsAt);
  await tx.interview.update({ where: { id: row.id }, data: { roomName: name, roomUrl: url, ...(side === "family" ? { familyJoinedAt: row.familyJoinedAt || new Date() } : { workerJoinedAt: row.workerJoinedAt || new Date() }) } });
  return { roomUrl: url, token, displayName };
}

export async function joinFamilyInterview(user: SessionUser, id: string) {
  if (user.role !== "CLIENT") throw new InterviewError("Family access is required for interviews.", 403);
  return serial(async (tx) => {
    const row = await locked(tx, id); owned(row, user.id);
    return joinLocked(tx, row, "family");
  });
}

export async function createInterviewBrowserTicket(user: SessionUser, id: string, appOrigin: string) {
  if (user.role !== "CLIENT") throw new InterviewError("Family access is required for interviews.", 403);
  return serial(async (tx) => {
    const row = await locked(tx, id); owned(row, user.id);
    if (row.status !== "CONFIRMED") throw new InterviewError("The interview must be confirmed before opening its call.", 409);
    const account = await tx.user.findUniqueOrThrow({ where: { id: user.id }, select: { sessionVersion: true } });
    const ticket = randomBytes(32).toString("base64url");
    await tx.interviewBrowserTicket.create({ data: { id: createHash("sha256").update(ticket).digest("hex"), userId: user.id, interviewId: row.id, sessionVersion: account.sessionVersion, expiresAt: new Date(Date.now() + 120_000) } });
    return { url: `${appOrigin}/interviews/access?ticket=${encodeURIComponent(ticket)}` };
  });
}

export async function consumeInterviewBrowserTicket(ticket: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(ticket)) throw new InterviewError("This sign-in link has expired. Open the interview again from the app.", 401);
  const id = createHash("sha256").update(ticket).digest("hex");
  return serial(async (tx) => {
    const consumed = await tx.interviewBrowserTicket.updateMany({ where: { id, consumed: false, expiresAt: { gt: new Date() } }, data: { consumed: true } });
    if (consumed.count !== 1) throw new InterviewError("This sign-in link has expired. Open the interview again from the app.", 401);
    const row = await tx.interviewBrowserTicket.findUniqueOrThrow({ where: { id }, include: { user: true, interview: true } });
    if (row.user.role !== "CLIENT" || row.sessionVersion !== row.user.sessionVersion || row.interview.userId !== row.userId || row.interview.status !== "CONFIRMED") throw new InterviewError("This sign-in link is no longer valid. Open the interview again from the app.", 401);
    return { user: row.user, interviewId: row.interviewId };
  });
}
