import { z } from "zod";
import { parseExperience, validExperience } from "../../shared/experience";
import { PREFERRED_LANGUAGES, selectedLanguages } from "../../shared/languages";
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
    category: z.enum([...WORKER_CATEGORIES, "UNASSIGNED"]),
    additionalPhone: z.string().trim().refine((value) => !value || isValidPhone(normalizePhone(value)), "Valid additional phone required").transform((value) => value ? normalizePhone(value) : "").nullable().optional(),
    secondaryCategory: z.enum(["", ...WORKER_CATEGORIES]).nullable().optional(),
    employmentType: z.enum([...EMPLOYMENT_TYPES, "UNASSIGNED"]),
    city: z.string().trim().min(2).max(100),
    area: text,
    age: nullableNumber(18, 100, true).optional(),
    experienceYears: nullableNumber(0, 80, true).optional(),
    experienceBreakdown: z.string().max(300).refine(validExperience, "Enter valid experience years for each service (total up to 80 years)").optional(),
    experienceCategories: z.string().max(100).refine((value) => {
      const categories = value.split(",").filter(Boolean);
      return categories.length <= 4 && new Set(categories).size === categories.length && categories.every((category) => ["HOUSEKEEPING", "ALLROUNDER", "BABYCARE", "JAPA"].includes(category));
    }, "Choose valid experience categories").optional(),
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
    maritalStatus: z.enum(["", "Single", "Married", "Divorced", "Widowed", "Separated"]).nullable().optional(),
    preferredLanguage: z.string().max(150).refine((value) => {
      const languages = selectedLanguages(value);
      return languages.length <= 4 && new Set(languages).size === languages.length && languages.every((language) => (PREFERRED_LANGUAGES as readonly string[]).includes(language));
    }, "Select up to 4 different preferred languages").transform((value) => selectedLanguages(value).join(", ")).nullable().optional(),
    qualification: z.enum(["", "Below 10th pass", "10th pass", "12th pass", "Graduation"]).nullable().optional(),
    englishLanguage: z.enum(["", "No English", "Thoda English", "Good English", "Fluent English"]).nullable().optional(),
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
  if (data.status === "AVAILABLE" && (data.category === "UNASSIGNED" || data.employmentType === "UNASSIGNED"))
    throw Object.assign(new Error("Review the type of help and work arrangement before publishing"), { status: 400 });
  if (data.experienceBreakdown && Object.keys(parseExperience(data.experienceBreakdown)).length) {
    const breakdown = parseExperience(data.experienceBreakdown);
    const selected = data.experienceCategories?.split(",").filter(Boolean);
    if (selected && (selected.some((category) => breakdown[category] == null) || Object.keys(breakdown).some((category) => !selected.includes(category))))
      throw Object.assign(new Error("Enter separate experience for every selected service"), { status: 400 });
    data.experienceYears = Object.values(breakdown).reduce((sum, years) => sum + years, 0);
  }
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
