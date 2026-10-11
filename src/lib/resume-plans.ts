export const RESUME_PLAN_GROUPS = [
  { id: "part-time", title: "Part-time", description: "Domestic Help, Babycare & All-round home help", prices: [299, 499, 699] },
  { id: "live-in", title: "24-hour Live-in", description: "Domestic Help, Babycare & All-round home help", prices: [399, 699, 999] },
  { id: "japa-live-in-single", title: "Japa Care · 24-hour Live-in", description: "Single baby · Newborn & mother care", prices: [599, 999, 1499] },
  { id: "japa-live-in-twins", title: "Japa Care · 24-hour Live-in", description: "Twins · Newborn & mother care", prices: [699, 1199] },
  { id: "japa-part-time-single", title: "Japa Care · Part-time", description: "Single baby · Newborn & mother care", prices: [499, 999] },
] as const;

export const RESUME_PLANS = RESUME_PLAN_GROUPS.flatMap((group, groupIndex) =>
  group.prices.map((priceInr, index) => ({
    id: `resume-interview-${group.id}-${index + 1}`,
    groupId: group.id,
    name: `${group.title} · ${group.description} · ${index + 1} ${index === 0 ? "profile" : "profiles"} + interview booking`,
    priceInr,
    credits: index + 1,
    active: true,
    sortOrder: groupIndex * 10 + index,
  })),
);
