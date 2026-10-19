import { z } from "zod";
import { SERVICES } from "./services";
import { SERVICE_DUTIES, SERVICE_PLANS } from "./service-plans";

export function todayInIndia() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

export const bookingAnswersSchema = z.object({
  city: z.string().trim().min(2).max(80),
  area: z.string().trim().min(2).max(100),
  address: z.string().trim().min(5).max(300),
  pincode: z.string().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit pincode"),
  duties: z.array(z.string().max(80)).min(1).max(8),
  homeSize: z.enum(["1 BHK", "2 BHK", "3 BHK", "4 BHK", "5+ BHK", "5 BHK", "6 BHK"]),
  dustingDuration: z.enum(["30 minutes", "1 hour", "1.5 hours", "2 hours"]).optional(),
  moppingMethod: z.enum(["Smart mop/wiper", "Hands only"]).optional(),
  numberOfFloors: z.enum(["1", "2", "3", "4", "5+"]).optional(),
  familyMembers: z.coerce.number().int().min(1).max(30),
  bathrooms: z.coerce.number().int().min(1).max(10),
  pets: z.enum(["No pets", "Dog", "Cat", "Other pets"]),
  babyType: z.enum(["single", "twins"]),
  childAge: z.enum(["0–2 months", "Newborn", "Under 1 year", "2–12 months", "2–6 months", "6–12 months", "1–3 years", "4–6 years", "7+ years", "Not applicable"]),
  foodPreference: z.enum(["Vegetarian", "Non-vegetarian", "Both", "Not applicable"]),
  dailyHours: z.coerce.number().int().min(1).max(24),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  weeklyOff: z.enum(["Flexible", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]),
  accommodation: z.enum(["Private room", "Shared room", "Not applicable"]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => value >= todayInIndia() && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value, "Choose today or a future joining date"),
  monthlySalary: z.coerce.number().int().min(1000).max(200000).optional(),
  language: z.enum(["No preference", "Hindi", "English", "Marathi", "Bengali", "Tamil", "Telugu"]),
  name: z.string().trim().min(2).max(100),
  notes: z.string().trim().max(1000),
});
export type BookingAnswers = z.infer<typeof bookingAnswersSchema>;
export const serviceBookingSchema = z.object({
  requestId: z.string().uuid(), serviceSlug: z.string().max(100), planId: z.string().max(150), answers: bookingAnswersSchema,
}).superRefine((input, ctx) => {
  const service = SERVICES.find(item => item.slug === input.serviceSlug);
  const plan = SERVICE_PLANS.find(item => item.id === input.planId);
  const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: "custom", path, message });
  if (!service) { issue(["serviceSlug"], "Choose an available service"); return; }
  if (!plan || plan.serviceSlug !== service.slug || (plan.babyType !== "any" && plan.babyType !== input.answers.babyType)) issue(["planId"], "Choose a plan matching your service and baby type");
  if (input.answers.duties.some(duty => !SERVICE_DUTIES[service.category].includes(duty))) issue(["answers", "duties"], "Choose duties for this service");
  if (service.employmentType === "LIVE_IN") {
    if (input.answers.dailyHours !== 24 || input.answers.accommodation === "Not applicable") issue(["answers", "accommodation"], "Choose accommodation for your Live-in worker");
  } else if (input.answers.dailyHours > 11 || input.answers.dailyHours < (["domestic-help", "japa-care"].includes(service.slug) ? 1 : service.category === "BABYCARE" ? 7 : 2) || input.answers.accommodation !== "Not applicable") issue(["answers", "dailyHours"], service.slug === "domestic-help" ? "Choose 1–11 hours for Part-time Domestic Help" : service.slug === "japa-care" ? "Choose 1–11 hours for Part-time Japa Care" : service.category === "BABYCARE" ? "Choose 7–11 hours for Part-time Babycare" : "Choose 2–11 hours for Part-time help");
  if (["BABYCARE", "JAPA"].includes(service.category) && input.answers.childAge === "Not applicable") issue(["answers", "childAge"], "Choose the baby's age");
  if (service.category === "JAPA" && !(service.employmentType === "LIVE_IN" ? ["Newborn", "Under 1 year"] : ["0–2 months", "Newborn", "Under 1 year"]).includes(input.answers.childAge)) issue(["answers", "childAge"], "Japa Care supports newborns and babies under 1 year");
  if (service.category === "ALLROUNDER" && input.answers.foodPreference === "Not applicable") issue(["answers", "foodPreference"], "Choose your food preference");
});
export type ServiceBookingInput = z.infer<typeof serviceBookingSchema>;
