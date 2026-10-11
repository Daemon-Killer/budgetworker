import type { InterviewView } from "../../../shared/interviews";
import styles from "./Interviews.module.css";

export const statusLabels: Record<InterviewView["status"], string> = {
  REQUESTED: "Awaiting a time", SCHEDULED: "Awaiting worker confirmation", CONFIRMED: "Confirmed",
  COMPLETED: "Completed", CANCELLED: "Cancelled", NO_SHOW: "Missed interview",
};
export function interviewTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) + " IST";
}
export function localIst(value: string) {
  return new Date(new Date(value).getTime() + 330 * 60_000).toISOString().slice(0, 16);
}
export function slotIso(value: string) { return new Date(value + ":00+05:30").toISOString(); }
export function minimumSlot() { return localIst(new Date(Math.ceil((Date.now() + 5 * 60_000 + 1) / 60_000) * 60_000).toISOString()); }
export function maximumSlot() { return localIst(new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString()); }
export async function interviewApi<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store", headers: { "Content-Type": "application/json", ...init?.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || (response.status === 401 ? "Please log in again to continue." : "Unable to complete this action. Please try again."));
  return data as T;
}
export function InterviewDetails({ interview }: { interview: InterviewView }) {
  return <dl className={styles.details}>
    <div><dt>Interview time</dt><dd>{interview.scheduledAt ? interviewTime(interview.scheduledAt) : "Your team is coordinating availability"}</dd></div>
    <div><dt>Duration</dt><dd>{interview.durationMinutes} minutes</dd></div>
    <div><dt>Work locality</dt><dd>{interview.meetingArea}</dd></div>
    <div><dt>Working hours</dt><dd>{interview.schedule}</dd></div>
    <div><dt>Expected monthly pay</dt><dd>{interview.expectedPayInr == null ? "To discuss" : "₹" + interview.expectedPayInr.toLocaleString("en-IN")}</dd></div>
    <div><dt>Duties to discuss</dt><dd>{interview.duties}</dd></div>
  </dl>;
}
export function CallSetupNotice() {
  return <p className={styles.warning}>Calls setup in progress. Interview requests and scheduling are available; joining private calls will be enabled once setup is complete.</p>;
}
