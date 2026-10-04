export type DirectoryWorker = {
  id: string;
  name: string;
  category: string;
  employmentType: string;
  city: string;
  area: string | null;
  age: number | null;
  skill: string | null;
  about: string | null;
  salaryExpectation: string | null;
  expectedPayInr: number | null;
  payPeriod: string;
  hoursPerDay: number | null;
  experienceYears: number | null;
  vegNonVeg: string | null;
  religion: string | null;
  livingLocation: string | null;
  workingLocation: string | null;
  whenCanJoin: string | null;
  photoUrl: string | null;
  policeVerified: boolean;
  aadhaarVerified: boolean;
  status: string;
  hasResume: boolean;
  resumeFileName: string | null;
  unlocked: boolean;
  distanceKm?: number;
};
export type DirectoryResult = {
  workers: DirectoryWorker[];
  total: number;
  page: number;
  pageSize: number;
};
export type ResumePack = {
  id: string;
  name: string;
  priceInr: number;
  credits: number;
};
export type DirectoryFilters = {
  city: string;
  area: string;
  category: string;
  employmentType: string;
  maxPay: string;
  payPeriod: string;
  maxHours: string;
  q: string;
  lat: string;
  lng: string;
  radius: string;
};
export const emptyFilters: DirectoryFilters = {
  city: "",
  area: "",
  category: "",
  employmentType: "",
  maxPay: "",
  payPeriod: "MONTH",
  maxHours: "",
  q: "",
  lat: "",
  lng: "",
  radius: "10",
};
export const periodLabels: Record<string, string> = {
  MONTH: "month",
  DAY: "day",
  HOUR: "hour",
};
export function directoryQuery(filters: DirectoryFilters, page = 1) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters))
    if (value) query.set(key, value);
  query.set("page", String(page));
  return query.toString();
}
