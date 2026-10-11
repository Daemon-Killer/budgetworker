import { SERVICES } from "./services";

export type ServicePlan = {
  id: string;
  serviceSlug: string;
  babyType: "single" | "twins" | "any";
  months: number;
  priceInr: number;
  replacements: number;
  name: string;
};

export const SERVICE_PLANS: ServicePlan[] = SERVICES.flatMap((service) => {
  const liveIn = service.employmentType === "LIVE_IN";
  const japa = service.category === "JAPA";
  const housekeeping = service.category === "HOUSEKEEPING";
  const groups: { babyType: ServicePlan["babyType"]; prices: number[] }[] = japa && liveIn
    ? [{ babyType: "single", prices: [3999, 6999] }, { babyType: "twins", prices: [4999, 8499] }]
    : [{ babyType: "any", prices: japa ? [2999, 4999] : liveIn ? housekeeping ? [4999, 7999] : [7999, 11999] : housekeeping ? [1999, 3499, 5999] : [2499, 3999, 6999] }];
  return groups.flatMap(({ babyType, prices }) => prices.map((priceInr, index) => {
    const months = japa ? [1, 2][index] : liveIn ? [6, 12][index] : [3, 6, 12][index];
    const replacements = japa ? [1, 2][index] : liveIn ? [2, 4][index] : [1, 2, 4][index];
    const babyLabel = babyType === "any" ? "" : babyType === "single" ? " · Single baby" : " · Twins";
    return { id: `service-${service.slug}-${babyType}-${months}m`, serviceSlug: service.slug, babyType, months, priceInr, replacements,
      name: `${service.title}${babyLabel} · ${months} ${months === 1 ? "month" : "months"} · ${replacements} ${replacements === 1 ? "replacement" : "replacements"}` };
  }));
});

export function plansForService(serviceSlug: string, babyType: "single" | "twins" = "single") {
  return SERVICE_PLANS.filter(plan => plan.serviceSlug === serviceSlug && (plan.babyType === "any" || plan.babyType === babyType));
}

export const SERVICE_DUTIES: Record<string, string[]> = {
  HOUSEKEEPING: ["Sweeping & mopping", "Dusting & tidying", "Bathroom cleaning", "Utensil cleaning", "Laundry & folding"],
  BABYCARE: ["Feeding support", "Bathing & hygiene", "Diaper changes", "Playtime & activities", "Sleep routines", "Child-related laundry"],
  ALLROUNDER: ["Cooking", "Meal preparation", "Kitchen cleaning", "Sweeping & mopping", "Dusting & tidying", "Laundry & folding"],
  JAPA: ["Newborn feeding support", "Bathing & hygiene", "Diaper changes", "Newborn sleep routines", "Mother-care support", "Baby laundry"],
};
