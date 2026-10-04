export const CATEGORIES = [
  "COOK",
  "HOUSEKEEPING",
  "ALLROUNDER",
  "BABYCARE",
  "JAPA",
  "ELDERCARE",
  "CHEF",
] as const;
export const LABELS: Record<string, string> = {
  COOK: "Cooking",
  HOUSEKEEPING: "Housekeeping",
  ALLROUNDER: "All-round home help",
  BABYCARE: "Childcare",
  JAPA: "Newborn & mother care",
  ELDERCARE: "Eldercare",
  CHEF: "Specialty chef",
};
export const PAY_PERIODS = ["HOUR", "DAY", "MONTH", "VISIT"] as const;
export type JobDto = {
  id: string;
  title: string;
  category: string;
  employmentType: string;
  description: string;
  city: string;
  area: string;
  payInr: number;
  payPeriod: string;
  schedule: string;
  status: string;
  createdAt: string;
  distanceKm: number | null;
  applicationCount: number;
  hasReviewed?: boolean;
};
export type WorkerDto = {
  id: string;
  name: string;
  category: string;
  employmentType: string;
  city: string;
  area: string | null;
  skill: string | null;
  about: string | null;
  salaryExpectation: string | null;
  experienceYears: number | null;
  policeVerified: boolean;
  aadhaarVerified: boolean;
  status: string;
  onboardingStatus: string;
  serviceRadiusKm: number;
  latitude?: number | null;
  longitude?: number | null;
  rating: number | null;
  reviewCount: number;
};
export type ApplicationDto = {
  id: string;
  status: string;
  message: string;
  createdAt: string;
  worker: WorkerDto;
  job: JobDto;
  contactPhone?: string;
};
export type MeDto = {
  user: { id: string; name: string | null; phone: string; role: string };
  worker: WorkerDto | null;
  jobs: JobDto[];
  applications: ApplicationDto[];
  reviews: { id: string; stars: number; comment: string; createdAt: string }[];
};
export function payLabel(job: Pick<JobDto, "payInr" | "payPeriod">) {
  return (
    "₹" +
    job.payInr.toLocaleString("en-IN") +
    " / " +
    job.payPeriod.toLowerCase()
  );
}
