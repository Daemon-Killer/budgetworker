"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { FamilyInterviewMutation, InterviewListResponse, InterviewOutcome, InterviewView } from "../../../shared/interviews";
import { CallSetupNotice, InterviewDetails, interviewApi, localIst, statusLabels } from "./InterviewUi";
import { readInterviewSlots, SlotFields } from "./SlotFields";
import styles from "./Interviews.module.css";

export function FamilyInterviewCard({ interview, callsConfigured, onChange, showRoomLink = true }: { interview: InterviewView; callsConfigured: boolean; onChange: () => Promise<void>; showRoomLink?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [slots, setSlots] = useState(["", "", ""]);
  const [outcome, setOutcome] = useState<InterviewOutcome | "">(interview.outcome || "");
  const active = ["REQUESTED", "SCHEDULED", "CONFIRMED"].includes(interview.status);
  const retry = ["CANCELLED", "NO_SHOW"].includes(interview.status);

  async function mutate(input: Omit<FamilyInterviewMutation, "version">) {
    setBusy(true); setError("");
    try {
      await interviewApi("/api/interviews/" + interview.id, { method: "PATCH", body: JSON.stringify({ ...input, version: interview.version }) });
      setEditing(false); setCancelConfirm(false); await onChange();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to update this interview."); await onChange(); }
    finally { setBusy(false); }
  }
  function reschedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError("");
    try {
      const { slots: visibleSlots, proposedSlots } = readInterviewSlots(formData);
      setSlots(visibleSlots);
      void mutate({ action: "RESCHEDULE", proposedSlots });
    } catch (e) { setError(e instanceof Error ? e.message : "Please choose at least two valid interview times."); }
  }
  function openReschedule() { setSlots([...interview.proposedSlots.slice(0, 3).map(localIst), "", "", ""].slice(0, 3)); setEditing(true); setCancelConfirm(false); }
  return <article className={styles.card}>
    <div className={styles.topline}><div><h2>{interview.workerName}</h2><Link href={"/workers/" + interview.workerId} className={styles.link}>View worker profile</Link></div><span className={styles.badge}>{statusLabels[interview.status]}</span></div>
    <InterviewDetails interview={interview} />
    {interview.status === "REQUESTED" && <p className={styles.muted}>We’re checking availability. Refresh this page to see updates; you won’t need to pay for another resume unlock.</p>}
    {interview.status === "SCHEDULED" && <p className={styles.muted}>A time has been proposed to the worker. The call becomes available after they accept.</p>}
    {retry && <p className={styles.muted}>Your included interview is still available. Choose new times and our team will coordinate another attempt.</p>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <div className={styles.actions}>
      {showRoomLink && <Link href={"/interviews/" + interview.id} className={styles.button}>{interview.status === "CONFIRMED" && callsConfigured ? "Open interview room" : "View interview"}</Link>}
      {(active || retry) && <button className={styles.secondary} disabled={busy} onClick={openReschedule}>{retry ? "Choose new times" : "Reschedule"}</button>}
      {active && <button className={styles.danger} disabled={busy} onClick={() => { setCancelConfirm(true); setEditing(false); }}>Cancel interview</button>}
    </div>
    {cancelConfirm && <div className={styles.divider}><p className={styles.muted}>Cancel this request? Your current call invitation will stop working. You can request new times later.</p><div className={styles.actions}><button className={styles.danger} disabled={busy} onClick={() => void mutate({ action: "CANCEL" })}>{busy ? "Cancelling…" : "Yes, cancel"}</button><button className={styles.secondary} disabled={busy} onClick={() => setCancelConfirm(false)}>Keep interview</button></div></div>}
    {editing && <form className={styles.divider} onSubmit={reschedule}><SlotFields slots={slots} onChange={setSlots} disabled={busy} /><p className={styles.muted}>The existing time and invitations will be replaced. Our team will confirm a new time.</p><div className={styles.actions}><button type="submit" className={styles.button} disabled={busy}>{busy ? "Updating…" : "Send new times"}</button><button type="button" className={styles.secondary} onClick={() => setEditing(false)} disabled={busy}>Close</button></div></form>}
    {interview.status === "COMPLETED" && <form className={styles.divider} onSubmit={e => { e.preventDefault(); if (outcome) void mutate({ action: "OUTCOME", outcome }); }}><label className={styles.field}>How did the interview go?<select value={outcome} required disabled={busy} onChange={e => setOutcome(e.target.value as InterviewOutcome)}><option value="">Choose an outcome</option><option value="INTERESTED">Interested in hiring</option><option value="NOT_A_FIT">Not a fit</option><option value="FOLLOW_UP">Need a follow-up</option></select></label><p className={styles.muted}>This helps our team follow up. Saving an outcome does not confirm employment or book an extra interview.</p><button className={styles.secondary} disabled={busy || !outcome || outcome === interview.outcome}>{busy ? "Saving…" : "Save outcome"}</button></form>}
  </article>;
}

export function InterviewList() {
  const [data, setData] = useState<InterviewListResponse | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(true);
  const load = useCallback(() => interviewApi<InterviewListResponse>("/api/interviews")
    .then(result => { setData(result); setError(""); })
    .catch(e => setError(e instanceof Error ? e.message : "Unable to load interviews."))
    .finally(() => setRefreshing(false)), []);
  useEffect(() => { void load(); }, [load]);
  return <div className={styles.page}>
    <header className={styles.header}><div><p className={styles.eyebrow}>Meet your shortlisted workers</p><h1 className={styles.title}>My interviews</h1><p className={styles.description}>One completed interview is included with each unlocked resume. Your team coordinates availability; all times are shown in IST.</p></div><div className={styles.actions}><Link className={styles.secondary} href="/account">My account</Link><button className={styles.secondary} onClick={() => { setRefreshing(true); void load(); }} disabled={refreshing}>{refreshing ? "Refreshing…" : "Refresh"}</button></div></header>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {data && !data.callsConfigured && <CallSetupNotice />}
    {!data && !error && <p role="status" className={styles.pending}>Loading your interviews…</p>}
    {data && data.interviews.length === 0 && <section className={styles.card + " " + styles.empty}><h2>Your next conversation starts with a profile</h2><p className={styles.description}>Browse local help, unlock a resume and choose “Request interview” on the profile.</p><div className={styles.actions}><Link href="/workers" className={styles.button}>Find home help</Link></div></section>}
    <div className={styles.list}>{data?.interviews.map(interview => <FamilyInterviewCard key={interview.id} interview={interview} callsConfigured={data.callsConfigured} onChange={load} />)}</div>
  </div>;
}
