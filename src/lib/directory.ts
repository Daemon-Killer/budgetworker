import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { toPublicWorker } from "./workers";
import { listUnlockedWorkerIds } from "./credits";
import { WORKER_CATEGORIES, EMPLOYMENT_TYPES } from "./constants";
import type { DirectoryResult } from "../../shared/directory";
const sql = Prisma.sql;
export function inputError(message: string): never {
  throw Object.assign(new Error(message), { status: 400 });
}
function numeric(sp: URLSearchParams, key: string, min: number, max: number) {
  const s = sp.get(key);
  if (s === null || s === "") return undefined;
  const n = Number(s);
  if (!Number.isFinite(n) || n < min || n > max) inputError("Invalid " + key);
  return n;
}
export async function searchWorkers(
  sp: URLSearchParams,
  userId?: string,
): Promise<DirectoryResult> {
  const clauses: Prisma.Sql[] = [
    sql`w.status='AVAILABLE'`,
    sql`w."onboardingStatus"='APPROVED'`,
  ];
  for (const key of ["city", "area"] as const) {
    const value = sp.get(key)?.trim();
    if (value)
      clauses.push(
        sql`lower(${Prisma.raw("w." + key)}) LIKE ${"%" + value.toLowerCase().replaceAll("%", "\\%").replaceAll("_", "\\_") + "%"}`,
      );
  }
  for (const [key, allowed] of [
    ["category", WORKER_CATEGORIES],
    ["employmentType", EMPLOYMENT_TYPES],
  ] as const) {
    const value = sp.get(key);
    if (value) {
      if (!(allowed as readonly string[]).includes(value))
        inputError("Invalid " + key);
      clauses.push(sql`${Prisma.raw('w."' + key + '"')}=${value}`);
    }
  }
  const q = sp.get("q")?.trim();
  if (q) {
    const term =
      "%" + q.toLowerCase().replaceAll("%", "\\%").replaceAll("_", "\\_") + "%";
    clauses.push(
      sql`(lower(w.name) LIKE ${term} OR lower(w.skill) LIKE ${term} OR lower(w.about) LIKE ${term})`,
    );
  }
  const maxPay = numeric(sp, "maxPay", 0, 1000000),
    maxHours = numeric(sp, "maxHours", 0.5, 24);
  if (maxPay !== undefined) {
    const period = sp.get("payPeriod") || "MONTH";
    if (!["MONTH", "DAY", "HOUR"].includes(period))
      inputError("Invalid payPeriod");
    clauses.push(
      sql`w."expectedPayInr"<=${maxPay} AND w."payPeriod"=${period}`,
    );
  }
  if (maxHours !== undefined) clauses.push(sql`w."hoursPerDay"<=${maxHours}`);
  const lat = numeric(sp, "lat", -90, 90),
    lng = numeric(sp, "lng", -180, 180),
    radius = numeric(sp, "radius", 1, 100) ?? 10;
  if ((lat === undefined) !== (lng === undefined))
    inputError("Latitude and longitude are required together");
  let distance = sql`NULL::double precision`;
  if (lat !== undefined && lng !== undefined) {
    distance = sql`6371.0*acos(least(1.0,greatest(-1.0,sin(radians(${lat}::double precision))*sin(radians(w.latitude))+cos(radians(${lat}::double precision))*cos(radians(w.latitude))*cos(radians(w.longitude-${lng}::double precision)))))`;
    clauses.push(
      sql`w.latitude IS NOT NULL AND w.longitude IS NOT NULL`,
      sql`${distance}<=${radius}`,
    );
  }
  const where = Prisma.join(clauses, " AND "),
    page = numeric(sp, "page", 1, 100000) ?? 1;
  if (!Number.isInteger(page)) inputError("Invalid page");
  const pageSize = 24;
  const [ids, count, unlocked] = await Promise.all([
    prisma.$queryRaw<{ id: string; distanceKm: number | null }[]>(
      sql`SELECT w.id,${distance} AS "distanceKm" FROM "Worker" w WHERE ${where} ORDER BY "distanceKm" ASC NULLS LAST,w."updatedAt" DESC,w.id ASC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
    ),
    prisma.$queryRaw<{ n: bigint }[]>(
      sql`SELECT count(*) AS n FROM "Worker" w WHERE ${where}`,
    ),
    userId ? listUnlockedWorkerIds(userId) : Promise.resolve(new Set<string>()),
  ]);
  const records = await prisma.worker.findMany({
    where: { id: { in: ids.map((x) => x.id) } },
    select: publicWorkerSelect,
  });
  const byId = new Map(records.map((w) => [w.id, w]));
  return {
    workers: ids.map(({ id, distanceKm }) => ({
      ...toPublicWorker(byId.get(id)!, unlocked.has(id)),
      ...(distanceKm === null
        ? {}
        : { distanceKm: Math.round(distanceKm * 10) / 10 }),
    })),
    total: Number(count[0].n),
    page,
    pageSize,
  };
}
export const publicWorkerSelect = {
  id: true,
  name: true,
  category: true,
  employmentType: true,
  city: true,
  area: true,
  age: true,
  skill: true,
  about: true,
  salaryExpectation: true,
  expectedPayInr: true,
  payPeriod: true,
  hoursPerDay: true,
  vegNonVeg: true,
  religion: true,
  experienceYears: true,
  livingLocation: true,
  workingLocation: true,
  whenCanJoin: true,
  photoUrl: true,
  policeVerified: true,
  aadhaarVerified: true,
  status: true,
  resumeFileName: true,
  resumeSize: true,
} satisfies Prisma.WorkerSelect;
