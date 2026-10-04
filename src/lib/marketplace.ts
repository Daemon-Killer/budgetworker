import { Prisma, type Job, type Worker } from "@prisma/client";
import { z } from "zod";
import { prisma } from "./db";
import { AuthError, type SessionUser } from "./auth";
import {
  CATEGORIES,
  PAY_PERIODS,
  type JobDto,
  type WorkerDto,
} from "../../shared/marketplace";

const text = (min: number, max: number) => z.string().trim().min(min).max(max);
export const jobSchema = z
  .object({
    title: text(5, 100),
    category: z.enum(CATEGORIES),
    employmentType: z.enum(["PART_TIME", "FULL_TIME"]),
    description: text(20, 2000),
    city: text(2, 80),
    area: text(2, 120),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    payInr: z.number().int().min(1).max(1000000),
    payPeriod: z.enum(PAY_PERIODS),
    schedule: text(3, 200),
  })
  .strict();
export const profileSchema = z
  .object({
    name: text(2, 100),
    category: z.enum(CATEGORIES),
    employmentType: z.enum(["PART_TIME", "FULL_TIME"]),
    city: text(2, 80),
    area: text(2, 120),
    skill: text(2, 300),
    about: text(0, 1000),
    salaryExpectation: text(1, 100),
    experienceYears: z.number().int().min(0).max(70),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    serviceRadiusKm: z.number().int().min(1).max(50),
  })
  .strict();
export const settingsSchema = z
  .object({
    headline: text(5, 100),
    description: text(10, 400),
    announcement: text(0, 200),
    defaultCity: text(2, 80),
    jobPostingEnabled: z.boolean(),
  })
  .strict();
export const DEFAULT_SETTINGS = {
  id: "main",
  headline: "Good help. Close to home.",
  description:
    "Browse local worker profiles for free. Choose a resume pack to unlock the people who fit your home.",
  announcement: "",
  defaultCity: "Pune",
  jobPostingEnabled: false,
};
export async function getSettings() {
  return (
    (await prisma.siteSettings.findUnique({ where: { id: "main" } })) ??
    DEFAULT_SETTINGS
  );
}
export function distanceKm(a: number, b: number, c: number, d: number) {
  const rad = (n: number) => (n * Math.PI) / 180;
  const h =
    Math.sin(rad(c - a) / 2) ** 2 +
    Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(rad(d - b) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
export function jobDto(
  j: Job & { _count?: { applications: number }; review?: unknown },
  lat?: number,
  lng?: number,
): JobDto {
  return {
    id: j.id,
    title: j.title,
    category: j.category,
    employmentType: j.employmentType,
    description: j.description,
    city: j.city,
    area: j.area,
    payInr: j.payInr,
    payPeriod: j.payPeriod,
    schedule: j.schedule,
    status: j.status,
    createdAt: j.createdAt.toISOString(),
    distanceKm:
      lat != null && lng != null
        ? Math.round(distanceKm(lat, lng, j.latitude, j.longitude) * 10) / 10
        : null,
    applicationCount: j._count?.applications ?? 0,
    ...(j.review !== undefined ? { hasReviewed: Boolean(j.review) } : {}),
  };
}
export function workerDto(
  w: Worker & { reviews?: { stars: number }[] },
  own = false,
): WorkerDto {
  const rs = w.reviews ?? [];
  return {
    id: w.id,
    name: w.name,
    category: w.category,
    employmentType: w.employmentType,
    city: w.city,
    area: w.area,
    skill: w.skill,
    about: w.about,
    salaryExpectation: w.salaryExpectation,
    experienceYears: w.experienceYears,
    policeVerified: w.policeVerified,
    aadhaarVerified: w.aadhaarVerified,
    status: w.status,
    onboardingStatus: w.onboardingStatus,
    serviceRadiusKm: w.serviceRadiusKm,
    rating: rs.length
      ? Math.round((rs.reduce((n, r) => n + r.stars, 0) / rs.length) * 10) / 10
      : null,
    reviewCount: rs.length,
    ...(own ? { latitude: w.latitude, longitude: w.longitude } : {}),
  };
}
export const publicWorkerSelect = {
  id: true,
  name: true,
  category: true,
  employmentType: true,
  city: true,
  area: true,
  skill: true,
  about: true,
  salaryExpectation: true,
  experienceYears: true,
  policeVerified: true,
  aadhaarVerified: true,
  status: true,
  onboardingStatus: true,
  serviceRadiusKm: true,
  latitude: true,
  longitude: true,
  reviews: { select: { stars: true } },
} as const;
export async function requireWorker(user: SessionUser) {
  const w = await prisma.worker.findUnique({ where: { userId: user.id } });
  if (!w) throw new AuthError("Create your worker profile first", 403);
  if (w.onboardingStatus !== "APPROVED" || w.status !== "AVAILABLE")
    throw new AuthError(
      "Your profile must be approved and available to apply",
      403,
    );
  return w;
}
export async function serial<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2034" &&
        attempt < 3
      )
        continue;
      throw e;
    }
  }
}
export function fail(message: string, status = 400): never {
  throw new AuthError(message, status);
}
export async function browseJobs(url: URL) {
  const q = url.searchParams;
  const input = z
    .object({
      city: z.string().max(80).optional(),
      category: z.enum(CATEGORIES).optional(),
      lat: z.coerce.number().min(-90).max(90).optional(),
      lng: z.coerce.number().min(-180).max(180).optional(),
      radius: z.coerce.number().min(1).max(50).default(10),
      cursor: z.string().max(100).optional(),
    })
    .parse(Object.fromEntries(q));
  if ((input.lat == null) !== (input.lng == null))
    fail("Both location coordinates are required");
  const where: Prisma.JobWhereInput = {
    status: "OPEN",
    visible: true,
    ...(input.city
      ? { city: { equals: input.city, mode: "insensitive" } }
      : {}),
    ...(input.category ? { category: input.category } : {}),
  };
  if (input.lat != null && input.lng != null) {
    const dy = input.radius / 111;
    const dx = Math.min(
      180,
      input.radius /
        (111 * Math.max(0.01, Math.cos((input.lat * Math.PI) / 180))),
    );
    where.latitude = { gte: input.lat - dy, lte: input.lat + dy };
    if (input.lng - dx >= -180 && input.lng + dx <= 180)
      where.longitude = { gte: input.lng - dx, lte: input.lng + dx };
  }
  const rows = await prisma.job.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 51,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    include: { _count: { select: { applications: true } } },
  });
  const page = rows.slice(0, 50);
  const jobs = page
    .map((j) => jobDto(j, input.lat, input.lng))
    .filter((j) => j.distanceKm == null || j.distanceKm <= input.radius);
  if (input.lat != null)
    jobs.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  return {
    jobs,
    nextCursor: rows.length > 50 ? page[page.length - 1]?.id : null,
  };
}
