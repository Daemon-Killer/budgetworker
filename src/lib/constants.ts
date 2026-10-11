export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Budget Worker";
export const DEFAULT_CITY = process.env.NEXT_PUBLIC_DEFAULT_CITY ?? "Pune";
/** Public site domain (no protocol). */
export const SITE_DOMAIN =
  process.env.NEXT_PUBLIC_SITE_DOMAIN ?? "budgetworker.in";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? `https://${SITE_DOMAIN}`;

export const ROLES = {
  CLIENT: "CLIENT",
  ADMIN: "ADMIN",
} as const;

export const WORKER_CATEGORIES = [
  "COOK",
  "HOUSEKEEPING",
  "ALLROUNDER",
  "BABYCARE",
  "JAPA",
  "ELDERCARE",
  "CHEF",
] as const;

export type WorkerCategory = (typeof WORKER_CATEGORIES)[number];

export const EMPLOYMENT_TYPES = ["PART_TIME", "FULL_TIME", "LIVE_IN"] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const WORKER_STATUSES = ["AVAILABLE", "PLACED", "INACTIVE"] as const;
export type WorkerStatus = (typeof WORKER_STATUSES)[number];

export const ORDER_STATUSES = ["PENDING", "PAID", "FAILED"] as const;

export const CATEGORY_LABELS: Record<WorkerCategory, string> = {
  COOK: "Cook",
  HOUSEKEEPING: "Domestic Help",
  ALLROUNDER: "All-round home help",
  BABYCARE: "Babycare",
  JAPA: "Newborn & mother care (Japa Care)",
  ELDERCARE: "Eldercare",
  CHEF: "Chef",
};

export const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  PART_TIME: "Part-time",
  FULL_TIME: "Full-time",
  LIVE_IN: "24 hours Live-in",
};

export function categoryLabel(c: string) {
  return CATEGORY_LABELS[c as WorkerCategory] ?? c;
}

export function employmentLabel(e: string) {
  return EMPLOYMENT_LABELS[e as EmploymentType] ?? e;
}
