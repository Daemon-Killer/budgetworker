import { withCors } from "@/lib/cors";
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import {
  browseJobs,
  distanceKm,
  jobDto,
  workerDto,
  jobSchema,
  profileSchema,
  settingsSchema,
  getSettings,
  requireWorker,
  serial,
  fail,
  publicWorkerSelect,
} from "@/lib/marketplace";

const workerWithReviews = { reviews: { select: { stars: true } } } as const;
function error(e: unknown) {
  if (e instanceof z.ZodError)
    return jsonOk(
      { error: e.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  return jsonError(e);
}
async function handleGET(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> },
) {
  try {
    const p = (await ctx.params).path ?? [];
    if (p.join("/") === "jobs") return jsonOk(await browseJobs(req.nextUrl));
    if (p.join("/") === "settings")
      return jsonOk({ settings: await getSettings() });
    const user = await requireUser(req);
    if (p.join("/") === "me") {
      const [worker, jobs, applications] = await Promise.all([
        prisma.worker.findUnique({
          where: { userId: user.id },
          include: { reviews: { orderBy: { createdAt: "desc" } } },
        }),
        prisma.job.findMany({
          where: { ownerId: user.id },
          orderBy: { createdAt: "desc" },
          take: 100,
          include: { _count: { select: { applications: true } }, review: true },
        }),
        prisma.jobApplication.findMany({
          where: { worker: { userId: user.id } },
          orderBy: { createdAt: "desc" },
          take: 100,
          include: {
            job: { include: { owner: { select: { phone: true } } } },
            worker: { include: workerWithReviews },
          },
        }),
      ]);
      return jsonOk({
        user,
        worker: worker ? workerDto(worker, true) : null,
        jobs: jobs.map((j) => jobDto(j)),
        applications: applications.map((a) => ({
          id: a.id,
          status: a.status,
          message: a.message,
          createdAt: a.createdAt.toISOString(),
          worker: workerDto(a.worker),
          job: jobDto(a.job),
          ...(["HIRED", "COMPLETED"].includes(a.status)
            ? { contactPhone: a.job.owner.phone }
            : {}),
        })),
        reviews:
          worker?.reviews.map((r) => ({
            id: r.id,
            stars: r.stars,
            comment: r.comment,
            createdAt: r.createdAt.toISOString(),
          })) ?? [],
      });
    }
    if (p[0] === "jobs" && p.length === 2) {
      const job = await prisma.job.findUnique({
        where: { id: p[1] },
        include: { _count: { select: { applications: true } }, review: true },
      });
      if (!job || job.ownerId !== user.id) fail("Job not found", 404);
      const applications = await prisma.jobApplication.findMany({
        where: { jobId: job.id },
        orderBy: { createdAt: "desc" },
        take: 200,
        include: { worker: { select: { ...publicWorkerSelect, phone: true } } },
      });
      return jsonOk({
        job: jobDto(job),
        applications: applications.map((a) => ({
          id: a.id,
          status: a.status,
          message: a.message,
          createdAt: a.createdAt.toISOString(),
          worker: workerDto(a.worker as Parameters<typeof workerDto>[0]),
          job: jobDto(job),
          ...(["HIRED", "COMPLETED"].includes(a.status)
            ? { contactPhone: a.worker.phone }
            : {}),
        })),
      });
    }
    if (p.join("/") === "admin/jobs") {
      await requireAdmin(req);
      const jobs = await prisma.job.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { _count: { select: { applications: true } } },
      });
      return jsonOk({
        jobs: jobs.map((j) => ({ ...jobDto(j), visible: j.visible })),
      });
    }
    fail("Not found", 404);
  } catch (e) {
    return error(e);
  }
}

async function handlePOST(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> },
) {
  try {
    const p = (await ctx.params).path ?? [];
    const user = await requireUser(req);
    const body = await req.json();
    if (p.join("/") === "jobs") {
      const settings = await getSettings();
      if (!settings.jobPostingEnabled)
        fail("New job posts are temporarily paused", 503);
      const data = jobSchema.parse(body);
      const daily = await prisma.job.count({
        where: {
          ownerId: user.id,
          createdAt: { gte: new Date(Date.now() - 86400000) },
        },
      });
      if (daily >= 10) fail("You can post up to 10 jobs each day", 429);
      const job = await prisma.job.create({
        data: { ...data, ownerId: user.id },
      });
      return jsonOk({ job: jobDto(job) }, { status: 201 });
    }
    if (p[0] === "jobs" && p[2] === "apply" && p.length === 3) {
      const worker = await requireWorker(user);
      const { message } = z
        .object({ message: z.string().trim().min(5).max(500) })
        .parse(body);
      const result = await serial(async (tx) => {
        const job = await tx.job.findUnique({ where: { id: p[1] } });
        if (!job || job.status !== "OPEN" || !job.visible)
          fail("This offer is no longer available", 409);
        if (job.ownerId === user.id) fail("You cannot apply to your own job");
        if (worker.latitude == null || worker.longitude == null)
          fail("Add your location to your work profile first");
        if (
          distanceKm(
            worker.latitude,
            worker.longitude,
            job.latitude,
            job.longitude,
          ) > worker.serviceRadiusKm
        )
          fail("This job is outside your travel radius");
        if (
          await tx.jobApplication.findUnique({
            where: { jobId_workerId: { jobId: job.id, workerId: worker.id } },
          })
        )
          fail("You already applied to this job", 409);
        return tx.jobApplication.create({
          data: { jobId: job.id, workerId: worker.id, message },
        });
      });
      return jsonOk(
        { application: { id: result.id, status: result.status } },
        { status: 201 },
      );
    }
    if (p[0] === "applications" && p[2] === "status" && p.length === 3) {
      const { action } = z
        .object({ action: z.enum(["offer", "accept", "withdraw", "reject"]) })
        .parse(body);
      await serial(async (tx) => {
        const a = await tx.jobApplication.findUnique({
          where: { id: p[1] },
          include: { job: true, worker: true },
        });
        if (!a) fail("Application not found", 404);
        const owner = a.job.ownerId === user.id;
        const worker = a.worker.userId === user.id;
        if (action === "offer") {
          if (!owner) fail("Only the family can offer this job", 403);
          if (
            a.status !== "APPLIED" ||
            a.job.status !== "OPEN" ||
            !a.job.visible
          )
            fail("This job cannot be offered now", 409);
          if (
            a.worker.status !== "AVAILABLE" ||
            a.worker.onboardingStatus !== "APPROVED"
          )
            fail("Worker is not currently available", 409);
          await tx.job.update({
            where: { id: a.jobId },
            data: { status: "OFFERED", assignedWorkerId: a.workerId },
          });
          await tx.jobApplication.update({
            where: { id: a.id },
            data: { status: "OFFERED" },
          });
        } else if (action === "accept") {
          if (!worker) fail("Only the selected worker can accept", 403);
          if (
            a.status !== "OFFERED" ||
            a.job.status !== "OFFERED" ||
            a.job.assignedWorkerId !== a.workerId ||
            !a.job.visible
          )
            fail("Offer is no longer available", 409);
          if (
            a.worker.status !== "AVAILABLE" ||
            a.worker.onboardingStatus !== "APPROVED"
          )
            fail("Worker profile must be approved and available", 403);
          await tx.job.update({
            where: { id: a.jobId },
            data: { status: "ACTIVE" },
          });
          await tx.jobApplication.update({
            where: { id: a.id },
            data: { status: "HIRED" },
          });
          await tx.jobApplication.updateMany({
            where: { jobId: a.jobId, id: { not: a.id }, status: "APPLIED" },
            data: { status: "REJECTED" },
          });
        } else if (action === "withdraw") {
          if (!worker) fail("Only this worker can withdraw", 403);
          if (!["APPLIED", "OFFERED"].includes(a.status))
            fail("Cannot withdraw this application", 409);
          await tx.jobApplication.update({
            where: { id: a.id },
            data: { status: "WITHDRAWN" },
          });
          if (a.status === "OFFERED")
            await tx.job.update({
              where: { id: a.jobId },
              data: { status: "OPEN", assignedWorkerId: null },
            });
        } else {
          if (!owner) fail("Only the family can decline", 403);
          if (!["APPLIED", "OFFERED"].includes(a.status))
            fail("Cannot decline this application", 409);
          await tx.jobApplication.update({
            where: { id: a.id },
            data: { status: "REJECTED" },
          });
          if (a.status === "OFFERED")
            await tx.job.update({
              where: { id: a.jobId },
              data: { status: "OPEN", assignedWorkerId: null },
            });
        }
      });
      return jsonOk({ ok: true });
    }
    if (p[0] === "jobs" && p[2] === "status" && p.length === 3) {
      const { action } = z
        .object({ action: z.enum(["complete", "cancel"]) })
        .parse(body);
      await serial(async (tx) => {
        const job = await tx.job.findUnique({ where: { id: p[1] } });
        if (!job || job.ownerId !== user.id) fail("Job not found", 404);
        if (action === "complete") {
          if (job.status !== "ACTIVE")
            fail("Only an accepted hire can be completed", 409);
          await tx.job.update({
            where: { id: job.id },
            data: { status: "COMPLETED" },
          });
          await tx.jobApplication.updateMany({
            where: { jobId: job.id, status: "HIRED" },
            data: { status: "COMPLETED" },
          });
        } else {
          if (["COMPLETED", "CANCELLED"].includes(job.status))
            fail("Job is already closed", 409);
          await tx.job.update({
            where: { id: job.id },
            data: { status: "CANCELLED" },
          });
          await tx.jobApplication.updateMany({
            where: {
              jobId: job.id,
              status: { in: ["APPLIED", "OFFERED", "HIRED"] },
            },
            data: { status: "CANCELLED" },
          });
        }
      });
      return jsonOk({ ok: true });
    }
    if (p[0] === "jobs" && p[2] === "review" && p.length === 3) {
      const data = z
        .object({
          stars: z.number().int().min(1).max(5),
          comment: z.string().trim().max(1000),
        })
        .parse(body);
      await serial(async (tx) => {
        const job = await tx.job.findUnique({ where: { id: p[1] } });
        if (!job || job.ownerId !== user.id) fail("Job not found", 404);
        if (job.status !== "COMPLETED" || !job.assignedWorkerId)
          fail("You can rate only a completed hire", 409);
        if (await tx.review.findUnique({ where: { jobId: job.id } }))
          fail("You already reviewed this hire", 409);
        await tx.review.create({
          data: {
            ...data,
            jobId: job.id,
            workerId: job.assignedWorkerId,
            authorId: user.id,
          },
        });
      });
      return jsonOk({ ok: true }, { status: 201 });
    }
    fail("Not found", 404);
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2002")
      return jsonOk(
        { error: "This application or review already exists" },
        { status: 409 },
      );
    return error(e);
  }
}

async function handlePUT(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> },
) {
  try {
    const p = (await ctx.params).path ?? [];
    const user = await requireUser(req);
    if (p.join("/") !== "worker") fail("Not found", 404);
    const data = profileSchema.parse(await req.json());
    const worker = await serial(async (tx) => {
      const own = await tx.worker.findUnique({ where: { userId: user.id } });
      if (own)
        return tx.worker.update({
          where: { id: own.id },
          data: {
            ...data,
            ...(data.name !== own.name
              ? {
                  onboardingStatus: "PENDING",
                  status: "INACTIVE",
                  policeVerified: false,
                  aadhaarVerified: false,
                }
              : {}),
          },
        });
      const candidates = await tx.worker.findMany({
        where: { phone: user.phone, userId: null },
        take: 2,
      });
      if (candidates.length > 1)
        fail("Contact support to link your existing profiles", 409);
      if (candidates.length === 1)
        return tx.worker.update({
          where: { id: candidates[0].id },
          data: {
            ...data,
            userId: user.id,
            ...(data.name !== candidates[0].name
              ? {
                  onboardingStatus: "PENDING",
                  status: "INACTIVE",
                  policeVerified: false,
                  aadhaarVerified: false,
                }
              : {}),
          },
        });
      return tx.worker.create({
        data: {
          ...data,
          phone: user.phone,
          userId: user.id,
          onboardingStatus: "PENDING",
          status: "INACTIVE",
        },
      });
    });
    return jsonOk({ worker: workerDto(worker, true) });
  } catch (e) {
    return error(e);
  }
}

async function handlePATCH(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> },
) {
  try {
    const p = (await ctx.params).path ?? [];
    const admin = await requireAdmin(req);
    const body = await req.json();
    if (p.join("/") === "admin/settings") {
      const data = settingsSchema.parse(body);
      await prisma.$transaction(async (tx) => {
        await tx.siteSettings.upsert({
          where: { id: "main" },
          create: { id: "main", ...data },
          update: data,
        });
        await tx.auditEntry.create({
          data: {
            actorId: admin.id,
            action: "UPDATE_SETTINGS",
            targetId: "main",
            details: JSON.stringify(data),
          },
        });
      });
      return jsonOk({ ok: true });
    }
    if (p[0] === "admin" && p[1] === "jobs" && p.length === 3) {
      const data = z.object({ visible: z.boolean() }).strict().parse(body);
      await prisma.$transaction(async (tx) => {
        await tx.job.update({ where: { id: p[2] }, data });
        await tx.auditEntry.create({
          data: {
            actorId: admin.id,
            action: "MODERATE_JOB",
            targetId: p[2],
            details: JSON.stringify(data),
          },
        });
      });
      return jsonOk({ ok: true });
    }
    if (p[0] === "admin" && p[1] === "workers" && p.length === 3) {
      const data = z.object({ approved: z.boolean() }).strict().parse(body);
      await prisma.$transaction(async (tx) => {
        await tx.worker.update({
          where: { id: p[2] },
          data: {
            onboardingStatus: data.approved ? "APPROVED" : "REJECTED",
            status: data.approved ? "AVAILABLE" : "INACTIVE",
          },
        });
        await tx.auditEntry.create({
          data: {
            actorId: admin.id,
            action: "REVIEW_WORKER",
            targetId: p[2],
            details: JSON.stringify(data),
          },
        });
      });
      return jsonOk({ ok: true });
    }
    fail("Not found", 404);
  } catch (e) {
    return error(e);
  }
}

type Context = { params: Promise<{ path?: string[] }> };
export async function GET(req: NextRequest, ctx: Context) {
  return withCors(req, () => handleGET(req, ctx));
}
export async function POST(req: NextRequest, ctx: Context) {
  return withCors(req, () => handlePOST(req, ctx));
}
export async function PUT(req: NextRequest, ctx: Context) {
  return withCors(req, () => handlePUT(req, ctx));
}
export async function PATCH(req: NextRequest, ctx: Context) {
  return withCors(req, () => handlePATCH(req, ctx));
}
export async function OPTIONS(req: NextRequest) {
  return withCors(req, async () => new Response(null, { status: 204 }));
}
