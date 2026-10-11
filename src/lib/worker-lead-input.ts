import { z } from "zod";
import { isValidPhone, normalizePhone } from "./phone";

export const WORK_TYPES = ["Domestic Help", "Babycare", "All-round home help", "Japa Care"] as const;
export const ARRANGEMENTS = ["Part-time", "24-hour Live-in"] as const;
export const LANGUAGES = ["Hindi", "English", "Marathi", "Bengali", "Tamil", "Telugu"] as const;
const phone = z.string().max(25).transform(normalizePhone).refine(isValidPhone, "Enter a valid Indian mobile number");
export const workerLeadSchema = z.object({
  requestId: z.string().uuid(), kind: z.enum(["REGISTER", "REFER"]),
  name: z.string().trim().min(2, "Enter the worker's name").max(100), phone,
  alternatePhone: z.preprocess(value => typeof value === "string" && !value.trim() ? undefined : value, phone.optional()),
  age: z.coerce.number().int().min(18, "Workers must be at least 18 years old").max(75),
  gender: z.enum(["Female", "Male", "Other"]),
  city: z.string().trim().min(2).max(80), area: z.string().trim().min(2).max(100),
  workTypes: z.array(z.enum(WORK_TYPES)).min(1, "Select at least one type of work").max(4),
  arrangements: z.array(z.enum(ARRANGEMENTS)).min(1, "Select Part-time or Live-in work").max(2),
  experience: z.coerce.number().int().min(0).max(50),
  languages: z.array(z.enum(LANGUAGES)).min(1, "Select at least one language").max(6),
  dailyHours: z.coerce.number().int().min(2).max(11),
  monthlySalary: z.coerce.number().int().min(1000).max(200000),
  availability: z.enum(["Immediately", "Within 1 week", "Within 2 weeks", "Within 1 month"]),
  notes: z.string().trim().max(1000),
  referrerName: z.string().trim().max(100), referrerPhone: z.string().max(25),
  relationship: z.enum(["", "Family", "Friend", "Neighbour", "Former employer", "Other"]),
  consent: z.literal(true, { error: "Please confirm permission to contact the worker" }),
  website: z.string().max(0),
}).superRefine((input, ctx) => {
  if (input.alternatePhone === input.phone) ctx.addIssue({ code: "custom", path: ["alternatePhone"], message: "Alternate mobile number must be different from the main number" });
  if (input.experience > input.age) ctx.addIssue({ code: "custom", path: ["experience"], message: "Check the worker's age and years of experience" });
  if (input.kind === "REFER") {
    if (input.referrerName.length < 2) ctx.addIssue({ code: "custom", path: ["referrerName"], message: "Enter your name" });
    if (!isValidPhone(normalizePhone(input.referrerPhone))) ctx.addIssue({ code: "custom", path: ["referrerPhone"], message: "Enter your valid mobile number" });
    if (!input.relationship) ctx.addIssue({ code: "custom", path: ["relationship"], message: "Choose your relationship with the worker" });
  }
});
export type WorkerLeadInput = z.infer<typeof workerLeadSchema>;
