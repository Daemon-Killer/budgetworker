export const EXPERIENCE_CATEGORIES = ["HOUSEKEEPING", "ALLROUNDER", "BABYCARE", "JAPA"] as const;
export function parseExperience(value: string): Record<string, number> {
  try { return JSON.parse(value || "{}"); } catch { return {}; }
}
export function validExperience(value: string) {
  try {
    const data = JSON.parse(value);
    return data && !Array.isArray(data) && typeof data === "object" && Object.entries(data).every(([key, years]) => (EXPERIENCE_CATEGORIES as readonly string[]).includes(key) && typeof years === "number" && Number.isInteger(years) && years >= 0 && years <= 80) && Object.values(data).reduce<number>((sum, years) => sum + Number(years), 0) <= 80;
  } catch { return false; }
}
