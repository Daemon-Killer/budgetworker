import type { BookingAnswers } from "./service-booking-input";
import type { ServiceCard } from "./services";

// Delhi NCR public Broomees rates checked on 2026-10-07, before the
// BudgetWorker 10% increase. Reference rates, not a live competitor quote.
// Sources: broomees.com and /api/getServicesData?cityId=1 for each service.
const allRounder: Record<number, number> = { 5: 11000, 6: 12000, 8: 16000, 10: 18000 };
const increase = (value: number) => Math.round(value * 110 / 100);
// Broomees public Domestic Help rates/formula checked 2026-10-07:
// /api/getServicesData?slug=online-maid-service&cityId=1,2,3,4,7.
// All five cities share these task rates; Noida applies a 10% discount.
// Slot adjustment, 4000/24000 limits and rounding follow their public form.
// The monthly adjustment is included in brooming/mopping and bathroom rates.
// Both selected: 500/200 split; one selected: the full 700 in that task.
// Existing totals and reference minimum/maximum remain intact for these tasks.
export function domesticSalaryEstimate(answers: BookingAnswers) {
  if (!answers.duties.length || answers.duties.includes("Laundry & folding") || (answers.duties.includes("Bathroom cleaning") && answers.bathrooms > 6)) return null;
  const items: { name: string; amount: number; minutes: number }[] = [];
  const rooms = Number.parseInt(answers.homeSize, 10);
  const floors = Number.parseInt(answers.numberOfFloors ?? "1", 10);
  if (answers.duties.includes("Sweeping & mopping")) {
    const prices = [2500,2500,4000,5000,5250,5750];
    const minutes = [30,45,75,90,90,110];
    const multiplier = [1,1.8,2.5,3.2,3.9][floors-1];
    items.push({ name: "Brooming & mopping", amount: (prices[rooms-1] + (answers.moppingMethod === "Hands only" ? 500 : 0)) * multiplier, minutes: minutes[rooms-1] * multiplier });
  }
  if (answers.duties.includes("Bathroom cleaning")) {
    const band = answers.bathrooms <= 2 ? 0 : answers.bathrooms <= 4 ? 1 : 2;
    items.push({ name: "Bathroom cleaning", amount: 500 + band * 300, minutes: 15 + band * 15 });
  }
  if (answers.duties.includes("Dusting & tidying")) {
    const duration = answers.dustingDuration ?? "30 minutes";
    const rates = { "30 minutes": [800,30], "1 hour": [1300,60], "1.5 hours": [1800,90], "2 hours": [3000,120] };
    const [amount,minutes] = rates[duration];
    items.push({ name: "Dusting", amount, minutes });
  }
  if (answers.duties.includes("Utensil cleaning")) {
    const index = Math.min(answers.familyMembers,7)-1;
    items.push({ name: "Dishwashing", amount: [500,900,1200,1500,1800,2100,2500][index], minutes: [15,25,40,45,50,60,70][index] });
  }
  const [hour,minute] = answers.startTime.split(":").map(Number);
  const start = hour * 60 + minute;
  const slotAdjustment = start >= 420 && start < 480 ? 250 : start >= 720 && start < 960 ? -150 : start >= 1140 && start < 1200 ? 100 : 0;
  const taskSalary = items.reduce((sum,item) => sum+item.amount,0);
  const cityMultiplier = answers.city.trim().toLowerCase() === "noida" ? 0.9 : 1;
  const limited = Math.max(4000, Math.min(taskSalary + slotAdjustment,24000) * cityMultiplier);
  const referenceSalary = limited % 100 >= 50 ? Math.ceil(limited/100)*100 : Math.round(limited);
  const cleaningItems = items.filter(item => ["Brooming & mopping", "Bathroom cleaning"].includes(item.name));
  const adjustment = cleaningItems.length ? 700 : 0;
  for (const item of cleaningItems) item.amount += cleaningItems.length === 1 ? 700 : item.name === "Brooming & mopping" ? 500 : 200;
  return { items, totalHours: Math.round(items.reduce((sum,item)=>sum+item.minutes,0)/60*100)/100, salaryInr: referenceSalary+adjustment, usesDelhiReference: !["delhi","gurgaon","gurugram","noida","ghaziabad","pune"].includes(answers.city.trim().toLowerCase()) };
}

export function workerSalaryEstimate(service: ServiceCard, answers: BookingAnswers): readonly [number, number] | null {
  if (service.employmentType === "LIVE_IN") {
    // Owner-supplied final monthly salary ranges for children aged 1–3 years.
    if (service.category === "BABYCARE" && answers.childAge === "1–3 years") return answers.babyType === "twins" ? [28000, 32000] : [23000, 26000];
    return null;
  }
  if (service.category === "JAPA") {
    // Owner-supplied monthly rate for each daily working hour.
    const salary = answers.dailyHours * (answers.babyType === "twins" ? 3500 : 3000);
    return [salary, salary];
  }
  let range: readonly [number, number] | undefined;
  if (service.category === "HOUSEKEEPING") {
    const estimate = domesticSalaryEstimate(answers);
    return estimate ? [estimate.salaryInr, estimate.salaryInr] : null;
  }
  if (service.category === "ALLROUNDER") {
    const exact = allRounder[answers.dailyHours];
    if (exact) range = [exact, exact];
    else {
      const hours = Object.keys(allRounder).map(Number).sort((a,b) => a-b);
      const lower = hours.filter(hour => hour < answers.dailyHours).at(-1);
      const upper = hours.find(hour => hour > answers.dailyHours);
      if (lower && upper) range = [allRounder[lower], allRounder[upper]];
    }
  }
  if (service.category === "BABYCARE") {
    // Owner-supplied monthly rate for each daily working hour.
    const salary = answers.dailyHours * (answers.babyType === "twins" ? 2500 : 2100);
    return [salary, salary];
  }
  return range ? [increase(range[0]), increase(range[1])] : null;
}
