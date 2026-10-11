"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { AdminInterviewListResponse, AdminInterviewMutation, AdminInterviewView } from "../../../shared/interviews";
import { CallSetupNotice, InterviewDetails, interviewApi, interviewTime, localIst, maximumSlot, minimumSlot, slotIso, statusLabels } from "./InterviewUi";
import styles from "./Interviews.module.css";

function AdminCard({ interview, refresh }: { interview: AdminInterviewView; refresh: () => Promise<void> }) {
  const [scheduled, setScheduled] = useState(interview.scheduledAt ? localIst(interview.scheduledAt) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [invite, setInvite] = useState("");
  const [copied, setCopied] = useState(false);
  const [pendingAction, setPendingAction] = useState<AdminInterviewMutation["action"] | null>(null);
  const active = ["REQUESTED", "SCHEDULED", "CONFIRMED"].includes(interview.status);

  async function mutate(action: AdminInterviewMutation["action"], scheduledIso?: string) {
    setBusy(true); setError(""); setCopied(false);
    try {
      const result = await interviewApi<{ interview: AdminInterviewView; workerInviteUrl?: string }>("/api/admin/interviews/" + interview.id, { method: "PATCH", body: JSON.stringify({ action, version: interview.version, ...(action === "CONFIRM" ? { scheduledAt: scheduledIso } : {}) }) });
      setInvite(result.workerInviteUrl || ""); setPendingAction(null); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to update interview."); setInvite(""); await refresh(); }
    finally { setBusy(false); }
  }
  function confirmTime(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const visibleTime = String(new FormData(event.currentTarget).get("scheduledAt") || "").trim();
    setError("");
    try {
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(visibleTime)) throw new Error("Please choose a valid agreed date and time.");
      const scheduledIso = slotIso(visibleTime);
      const time = new Date(scheduledIso).getTime();
      if (time < Date.now() + 5 * 60_000) throw new Error("Please choose a time at least five minutes from now.");
      if (time > Date.now() + 30 * 24 * 60 * 60_000) throw new Error("Please choose a time within the next 30 days.");
      setScheduled(visibleTime);
      void mutate("CONFIRM", scheduledIso);
    } catch (e) { setError(e instanceof Error ? e.message : "Please choose a valid agreed date and time."); }
  }
  async function copyInvite() { try { await navigator.clipboard.writeText(invite); setCopied(true); } catch { setError("Copy isn’t available in this browser. Select and copy the invitation below."); } }
  return <article className={styles.card}>
    <div className={styles.topline}><div><h2>{interview.familyName} ↔ {interview.workerName}</h2><p className={styles.muted}>{interview.city}{interview.area ? " · " + interview.area : ""}</p></div><span className={styles.badge}>{statusLabels[interview.status]}</span></div>
    <dl className={styles.details}><div><dt>Family contact · private</dt><dd><a href={"tel:" + interview.familyPhone} className={styles.link}>{interview.familyPhone}</a></dd></div><div><dt>Worker contact · private</dt><dd><a href={"tel:" + interview.workerPhone} className={styles.link}>{interview.workerPhone}</a></dd></div></dl>
    <InterviewDetails interview={interview} />
    <div><h3>Family’s proposed times</h3><ul className={styles.slots}>{interview.proposedSlots.map(slot => <li key={slot}>{interviewTime(slot)}</li>)}</ul></div>
    {interview.outcome && <p className={styles.notice}>Family outcome: {interview.outcome === "INTERESTED" ? "Interested in hiring" : interview.outcome === "NOT_A_FIT" ? "Not a fit" : "Follow-up requested"}</p>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    {active && <form className={styles.divider} onSubmit={confirmTime}>
      <label className={styles.field}>Time agreed with the worker (IST)<input name="scheduledAt" type="datetime-local" required min={minimumSlot()} max={maximumSlot()} value={scheduled} onInput={e => setScheduled(e.currentTarget.value)} onChange={e => setScheduled(e.target.value)} disabled={busy} /></label>
      <p className={styles.muted}>Check availability by phone before scheduling. Scheduling creates a new private invitation; the worker must accept it. Previous invitations stop working if the time changes.</p>
      <div className={styles.actions}><button className={styles.button} disabled={busy}>{busy ? "Updating…" : interview.status === "REQUESTED" ? "Schedule & create worker invite" : "Update time & create new invite"}</button><Link href={"/workers/" + interview.workerId} className={styles.link}>Worker profile</Link></div>
    </form>}
    {invite && <div className={styles.notice + " " + styles.fields}><h3>Send this invitation privately to the worker</h3><p>This page gives access to this interview only. Copy it now; the raw link is not saved in the dashboard. No message has been sent automatically.</p><label className={styles.field}>Private worker invitation<textarea readOnly value={invite} onFocus={e => e.target.select()} className={styles.invite} /></label><button className={styles.secondary} onClick={() => void copyInvite()}>{copied ? "Copied" : "Copy worker invitation"}</button><Link href={"/interviews/" + interview.id} className={styles.link} referrerPolicy="no-referrer">Family interview page</Link></div>}
    <div className={styles.actions}>
      {interview.status === "CONFIRMED" && <button className={styles.secondary} disabled={busy} onClick={() => setPendingAction("COMPLETE")}>Mark completed</button>}
      {["SCHEDULED", "CONFIRMED"].includes(interview.status) && <button className={styles.secondary} disabled={busy} onClick={() => setPendingAction("NO_SHOW")}>Mark no-show</button>}
      {active && <button className={styles.danger} disabled={busy} onClick={() => setPendingAction("CANCEL")}>Cancel request</button>}
      {["CANCELLED", "NO_SHOW"].includes(interview.status) && <button className={styles.secondary} disabled={busy} onClick={() => setPendingAction("RETRY")}>Allow another attempt</button>}
    </div>
    {pendingAction && <div className={styles.divider}><p className={styles.muted}>{pendingAction === "COMPLETE" ? "Confirm that the family and worker completed the conversation. This uses the included interview; both participants must have joined." : pendingAction === "NO_SHOW" ? "Record a missed interview after the join window ends, 30 minutes after the scheduled time. The family keeps their included interview and may choose new times." : pendingAction === "CANCEL" ? "Cancel this request and invalidate all invitations? The family can request new times later." : "Return this request to the coordination queue? The family’s included interview will remain available."}</p><div className={styles.actions}><button className={pendingAction === "CANCEL" ? styles.danger : styles.button} onClick={() => void mutate(pendingAction)} disabled={busy}>{busy ? "Saving…" : "Confirm"}</button><button className={styles.secondary} onClick={() => setPendingAction(null)} disabled={busy}>Close</button></div></div>}
  </article>;
}

export function AdminInterviews() {
  const [data, setData] = useState<AdminInterviewListResponse | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const refresh = useCallback(() => interviewApi<AdminInterviewListResponse>("/api/admin/interviews")
    .then(result => { setData(result); setError(""); })
    .catch(e => setError(e instanceof Error ? e.message : "Unable to load interviews."))
    .finally(() => setRefreshing(false)), []);
  useEffect(() => { void refresh(); }, [refresh]);
  const interviews = data?.interviews.filter(interview => filter === "ALL" || interview.status === filter) || [];
  return <div className={styles.page}>
    <header className={styles.header}><div><p className={styles.eyebrow}>Family ↔ worker conversations</p><h1 className={styles.title}>Interview coordination</h1><p className={styles.description}>Check availability, confirm a time and send the worker’s private invitation manually. Each resume unlock includes one completed interview.</p></div><button className={styles.secondary} disabled={refreshing} onClick={() => { setRefreshing(true); void refresh(); }}>{refreshing ? "Refreshing…" : "Refresh requests"}</button></header>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {data && !data.callsConfigured && <CallSetupNotice />}
    <label className={styles.field + " " + styles.filters}>Show status<select value={filter} onChange={e => setFilter(e.target.value)}><option value="ALL">All requests</option>{Object.entries(statusLabels).map(([status, label]) => <option key={status} value={status}>{label}</option>)}</select></label>
    {!data && !error && <p className={styles.pending} role="status">Loading requests…</p>}
    {data && interviews.length === 0 && <section className={styles.card + " " + styles.empty}><h2>No interviews here yet</h2><p className={styles.muted}>Family requests from unlocked worker profiles will appear here.</p></section>}
    <div className={styles.list}>{interviews.map(interview => <AdminCard key={interview.id} interview={interview} refresh={refresh} />)}</div>
  </div>;
}
