import * as Linking from "expo-linking";
import { API_URL, request } from "./api";
import type { AdminInterviewView, InterviewView } from "../../../shared/interviews";

export type { AdminInterviewView, InterviewView };
export type SlotDraft = { date: string; time: string };

export const interviewStatusLabels: Record<InterviewView["status"], string> = {
  REQUESTED: "Awaiting scheduling",
  SCHEDULED: "Waiting for worker confirmation",
  CONFIRMED: "Interview confirmed",
  COMPLETED: "Interview completed",
  CANCELLED: "Cancelled · interview still available",
  NO_SHOW: "Missed interview · contact the team",
};
export const outcomeOptions: [string, string][] = [
  ["INTERESTED", "Interested"],
  ["NOT_A_FIT", "Not a fit"],
  ["FOLLOW_UP", "Need a follow-up"],
];

export function formatInterviewTime(value: string): string {
  return new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }) + " IST";
}

export function toSlotDraft(value?: string | null): SlotDraft {
  if (!value) return { date: "", time: "" };
  const d = new Date(new Date(value).getTime() + 330 * 60_000);
  return { date: d.toISOString().slice(0, 10), time: d.toISOString().slice(11, 16) };
}

export function parseInterviewSlot(slot: SlotDraft): string {
  const date = slot.date.trim(), time = slot.time.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    throw Error("Enter a date as YYYY-MM-DD and a time as HH:mm, in India time.");
  }
  const parsed = new Date(date + "T" + time + ":00+05:30");
  if (!Number.isFinite(parsed.getTime())) throw Error("Choose a valid date and time.");
  const roundTrip = toSlotDraft(parsed.toISOString());
  if (roundTrip.date !== date || roundTrip.time !== time) {
    throw Error("Choose a valid calendar date and time.");
  }
  const ahead = parsed.getTime() - Date.now();
  if (ahead <= 5 * 60_000) throw Error("Choose a time at least five minutes from now.");
  if (ahead > 30 * 24 * 60 * 60_000) throw Error("Choose a time within the next 30 days.");
  return parsed.toISOString();
}

export function parseProposedSlots(slots: SlotDraft[]): string[] {
  const used = slots.filter((slot) => slot.date.trim() || slot.time.trim());
  if (!used.length) throw Error("Suggest at least one interview time.");
  const parsed = used.map(parseInterviewSlot);
  if (new Set(parsed).size !== parsed.length) throw Error("Choose different interview times.");
  return parsed;
}

export function validateInterviewBrowserUrl(value: string): string {
  const url = new URL(value), base = new URL(API_URL);
  const localHttp = __DEV__ && url.protocol === "http:" &&
    ["localhost", "127.0.0.1", "[::1]", "10.0.2.2"].includes(url.hostname);
  if (url.origin !== base.origin || url.username || url.password ||
    (url.protocol !== "https:" && !localHttp)) {
    throw Error("The interview link must use the secure Budget Worker website.");
  }
  return url.href;
}

export async function openInterviewBrowser(id: string): Promise<void> {
  const { url } = await request<{ url: string }>(
    "interviews/" + encodeURIComponent(id) + "/browser-ticket", "POST", {},
  );
  await Linking.openURL(validateInterviewBrowserUrl(url));
}
