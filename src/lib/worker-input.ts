import { z } from "zod";
import {
  WORKER_CATEGORIES,
  EMPLOYMENT_TYPES,
  WORKER_STATUSES,
} from "./constants";
import { normalizePhone, isValidPhone } from "./phone";
const nullableNumber = (min: number, max: number, integer = false) =>
  z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    (integer ? z.number().int() : z.number()).min(min).max(max).nullable(),
  );
const text = z.string().trim().max(2000).nullable().optional();
export const workerInput = z
  .object({
    name: z.string().trim().min(2).max(100),
    phone: z
      .string()
      .transform(normalizePhone)
      .refine(isValidPhone, "Valid phone required"),
    category: z.enum(WORKER_CATEGORIES),
    employmentType: z.enum(EMPLOYMENT_TYPES),
    city: z.string().trim().min(2).max(100),
    area: text,
    age: nullableNumber(18, 100, true).optional(),
    experienceYears: nullableNumber(0, 80, true).optional(),
    expectedPayInr: nullableNumber(1, 1000000, true).optional(),
    payPeriod: z.enum(["MONTH", "DAY", "HOUR"]).optional(),
    hoursPerDay: nullableNumber(0.5, 24).optional(),
    latitude: nullableNumber(-90, 90).optional(),
    longitude: nullableNumber(-180, 180).optional(),
    skill: text,
    about: text,
    salaryExpectation: text,
    vegNonVeg: text,
    religion: text,
    livingLocation: text,
    workingLocation: text,
    whenCanJoin: text,
    photoUrl: z
      .union([z.string().url().max(1000), z.literal(""), z.null()])
      .optional(),
    policeVerified: z.boolean().optional(),
    aadhaarVerified: z.boolean().optional(),
    status: z.enum(WORKER_STATUSES).optional(),
    internalNotes: text,
  })
  .strict();
export function validateWorker(body: unknown, partial = false) {
  const result = (partial ? workerInput.partial() : workerInput).safeParse(
    body,
  );
  if (!result.success)
    throw Object.assign(new Error(result.error.issues[0].message), {
      status: 400,
    });
  const data = result.data;
  if (
    "latitude" in data !== "longitude" in data ||
    (data.latitude == null) !== (data.longitude == null)
  )
    throw Object.assign(
      new Error("Select a location or provide both coordinates"),
      { status: 400 },
    );
  return data;
}
