"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { DirectoryWorker, ResumePack } from "../../../shared/directory";
import type { InterviewEligibility, InterviewView } from "../../../shared/interviews";
import { ResumeAccess } from "@/components/directory/ResumeAccess";
import { CallSetupNotice, interviewApi, statusLabels } from "./InterviewUi";
import { readInterviewSlots, SlotFields } from "./SlotFields";
import styles from "./Interviews.module.css";

export function RequestInterview({ worker, packs, balance }: { worker: DirectoryWorker; packs: ResumePack[]; balance: number }) {
  const router = useRouter();
  const [eligibility, setEligibility] = useState<InterviewEligibility | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [slots, setSlots] = useState(["", "", ""]);
  const [duties, setDuties] = useState("");
  const [schedule, setSchedule] = useState(worker.hoursPerDay ? `${worker.hoursPerDay} hours per day` : "");
  const [area, setArea] = useState([worker.area, worker.city].filter(Boolean).join(", "));
  const [pay, setPay] = useState(worker.payPeriod === "MONTH" && worker.expectedPayInr ? String(worker.expectedPayInr) : "");

  async function load() {
    setError("");
    try { setEligibility(await interviewApi<InterviewEligibility>("/api/interviews/eligibility?workerId=" + encodeURIComponent(worker.id))); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to load interview access."); }
  }
  useEffect(() => { let active = true; interviewApi<InterviewEligibility>("/api/interviews/eligibility?workerId=" + encodeURIComponent(worker.id)).then(data => { if (active) setEligibility(data); }).catch(e => { if (active) setError(e instanceof Error ? e.message : "Unable to load interview access."); }); return () => { active = false; }; }, [worker.id]);

  async function request(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError("");
    try {
      const { slots: visibleSlots, proposedSlots } = readInterviewSlots(formData);
      setSlots(visibleSlots);
      const visiblePay = String(formData.get("expectedPayInr") || "");
      setBusy(true);
      const result = await interviewApi<{ interview: InterviewView }>("/api/interviews", { method: "POST", body: JSON.stringify({ workerId: worker.id, proposedSlots, duties: String(formData.get("duties") || ""), schedule: String(formData.get("schedule") || ""), meetingArea: String(formData.get("meetingArea") || ""), expectedPayInr: visiblePay ? Number(visiblePay) : null }) });
      router.push("/interviews/" + result.interview.id);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to request this interview."); }
    finally { setBusy(false); }
  }
  return <div className={styles.page}>
    <Link href={"/workers/" + worker.id} className={styles.link}>← Back to {worker.name}’s profile</Link>
    <header><p className={styles.eyebrow}>Included with your resume unlock</p><h1 className={styles.title}>Meet {worker.name}</h1><p className={styles.description}>A private, 15-minute conversation to discuss duties, working hours and pay. Our team coordinates a time with the worker.</p></header>
    {error && <div role="alert" className={styles.error}>{error}{!eligibility && <button className={styles.secondary} onClick={() => void load()}>Try again</button>}</div>}
    {!eligibility ? (!error && <p role="status" className={styles.pending}>Checking your interview access…</p>) : !eligibility.unlocked ? <section className={styles.card}>
      <h2>Unlock this resume to request an interview</h2><p className={styles.description}>One completed interview with this worker is included. No extra interview credit is needed.</p>
      <ResumeAccess worker={worker} packs={packs} loggedIn balance={balance} onUnlock={() => void load()} />
    </section> : eligibility.interview ? <section className={styles.card}>
      <h2>Your interview with {worker.name}</h2><span className={styles.badge}>{statusLabels[eligibility.interview.status]}</span>
      <p className={styles.muted}>{eligibility.interview.status === "COMPLETED" ? "Your included interview has been completed. You can save your outcome in your interviews." : "Manage your existing request, join the call or choose new times from your interviews."}</p>
      <Link className={styles.button} href={"/interviews/" + eligibility.interview.id}>View interview</Link>
    </section> : <div className={styles.columns}><form className={styles.card} onSubmit={event => void request(event)}>
      {!eligibility.callsConfigured && <CallSetupNotice />}
      <SlotFields slots={slots} onChange={setSlots} disabled={busy} />
      <label className={styles.field}>Duties you would like help with<textarea name="duties" required minLength={5} maxLength={1000} value={duties} onChange={e => setDuties(e.target.value)} placeholder="For example: daily cooking for four people and kitchen cleaning" disabled={busy} /><small>Describe the work. Please leave out phone numbers, email addresses and your exact home address.</small></label>
      <label className={styles.field}>Working hours and days<input name="schedule" required maxLength={300} value={schedule} onChange={e => setSchedule(e.target.value)} placeholder="For example: 8–10 am, Monday to Saturday" disabled={busy} /></label>
      <label className={styles.field}>Work locality<input name="meetingArea" required maxLength={200} value={area} onChange={e => setArea(e.target.value)} placeholder="Area and city" disabled={busy} /></label>
      <label className={styles.field}>Estimated monthly pay (₹, optional)<input name="expectedPayInr" type="number" min="1" max="1000000" step="1" value={pay} onChange={e => setPay(e.target.value)} disabled={busy} /><small>This is a discussion point; it does not make a payment or confirm employment.</small></label>
      <button type="submit" className={styles.button} disabled={busy}>{busy ? "Sending request…" : "Request included interview"}</button>
    </form><aside className={styles.card}><h2>What happens next</h2><ol className={styles.steps}><li>Our team checks the worker’s availability against your times.</li><li>The worker confirms a private invitation.</li><li>Your interview page shows the confirmed time and join button.</li></ol><p className={styles.muted}>Use a quiet place and headphones. Video is optional. There are no recordings or public contact details.</p><Link href="/account/interviews" className={styles.link}>See my interviews</Link></aside></div>}
  </div>;
}
