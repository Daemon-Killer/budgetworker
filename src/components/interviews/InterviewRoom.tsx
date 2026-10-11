"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { InterviewJoin, InterviewListResponse, InterviewView } from "../../../shared/interviews";
import { FamilyInterviewCard } from "./InterviewList";
import { CallSetupNotice, InterviewDetails, interviewApi, statusLabels } from "./InterviewUi";
import { CallRoom } from "./CallRoom";
import styles from "./Interviews.module.css";

type RoomData = { interview: InterviewView; callsConfigured: boolean };

export function InterviewRoom({ id, inviteToken }: { id?: string; inviteToken?: string }) {
  const [data, setData] = useState<RoomData | null>(null);
  const [call, setCall] = useState<InterviewJoin | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(true);
  const [declining, setDeclining] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [left, setLeft] = useState(false);
  const invite = Boolean(inviteToken);
  const inviteUrl = "/api/interviews/invite/" + encodeURIComponent(inviteToken || "");

  const load = useCallback(() => {
    const request = inviteToken
      ? interviewApi<RoomData>("/api/interviews/invite/" + encodeURIComponent(inviteToken))
      : interviewApi<InterviewListResponse>("/api/interviews").then(result => {
        const interview = result.interviews.find(item => item.id === id);
        if (!interview) throw new Error("This interview is unavailable for your account.");
        return { interview, callsConfigured: result.callsConfigured };
      });
    return request.then(result => setData(result))
      .catch(e => { setError(e instanceof Error ? e.message : "Unable to load this interview."); setData(null); })
      .finally(() => setRefreshing(false));
  }, [id, inviteToken]);
  useEffect(() => { void load(); }, [load]);

  async function respond(action: "ACCEPT" | "DECLINE") {
    setBusy(true); setError("");
    try { await interviewApi(inviteUrl, { method: "POST", body: JSON.stringify({ action }) }); setDeclining(false); if (action === "DECLINE") { setDeclined(true); setData(null); } else await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to respond to this invitation."); }
    finally { setBusy(false); }
  }
  async function join() {
    setBusy(true); setError("");
    try { setCall(await interviewApi<InterviewJoin>(invite ? inviteUrl : "/api/interviews/" + id + "/join", { method: "POST", ...(invite ? { body: JSON.stringify({ action: "JOIN" }) } : {}) })); setLeft(false); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to join the call."); }
    finally { setBusy(false); }
  }
  async function refresh() { setRefreshing(true); setError(""); await load(); }
  if (call) return <div className={styles.page}><header className={styles.header}><div><p className={styles.eyebrow}>Private interview</p><h1 className={styles.title}>{invite ? "Meet the family" : "Meet " + data?.interview.workerName}</h1></div><p className={styles.muted}>Microphone required · Camera optional</p></header><div className={styles.room}><CallRoom {...call} onLeave={() => { setCall(null); setLeft(true); void load(); }} /></div></div>;
  if (declined) return <section className={styles.card}><p className={styles.eyebrow}>Availability updated</p><h1 className={styles.title}>This time has been declined</h1><p className={styles.description}>Our team will coordinate another time with you. This private invitation is now closed; use the new invitation when it arrives.</p></section>;
  return <div className={styles.page}>
    <header className={styles.header}><div><p className={styles.eyebrow}>{invite ? "Your private invitation" : "Included with your resume unlock"}</p><h1 className={styles.title}>{invite ? "Your family interview" : "Interview with " + (data?.interview.workerName || "your shortlisted worker")}</h1><p className={styles.description}>Discuss the work, timings and pay in a private 15-minute conversation on Budget Worker.</p></div><button className={styles.secondary} onClick={() => void refresh()} disabled={refreshing || busy}>{refreshing ? "Refreshing…" : "Refresh status"}</button></header>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {!data && !error && <p role="status" className={styles.pending}>Loading your interview…</p>}
    {left && <p className={styles.notice}>You’ve left the call. You can rejoin while the interview is still open. Our team will confirm completion after the conversation.</p>}
    {data && <>
      {!data.callsConfigured && <CallSetupNotice />}
      {invite ? <section className={styles.card}><div className={styles.topline}><h2>{data.interview.workerName}’s interview</h2><span className={styles.badge}>{statusLabels[data.interview.status]}</span></div><InterviewDetails interview={data.interview} />
        {data.interview.status === "SCHEDULED" && <><p className={styles.muted}>Can you attend at this time? Accepting confirms your availability to the family. You can decline if the time does not work.</p><div className={styles.actions}><button className={styles.button} disabled={busy} onClick={() => void respond("ACCEPT")}>{busy ? "Updating…" : "Accept interview"}</button><button className={styles.secondary} disabled={busy} onClick={() => setDeclining(true)}>I’m unavailable</button></div></>}
        {data.interview.status === "CONFIRMED" && <><p className={styles.notice}>Your interview is confirmed. Keep this invitation private and use it to join at the agreed time.</p><button className={styles.secondary} disabled={busy} onClick={() => setDeclining(true)}>I can no longer attend</button></>}
        {data.interview.status === "REQUESTED" && <p className={styles.muted}>Our team will coordinate a new time with you. A fresh invitation will follow once a time is agreed.</p>}
        {declining && <div className={styles.divider}><p className={styles.muted}>Tell our team this time does not work? This invitation will close and they will coordinate another time.</p><div className={styles.actions}><button className={styles.danger} disabled={busy} onClick={() => void respond("DECLINE")}>Decline this time</button><button className={styles.secondary} disabled={busy} onClick={() => setDeclining(false)}>Keep time</button></div></div>}
      </section> : <FamilyInterviewCard interview={data.interview} callsConfigured={data.callsConfigured} onChange={load} showRoomLink={false} />}
      {data.interview.status === "CONFIRMED" && <section className={styles.card}><h2>Ready for your conversation?</h2><p className={styles.description}>Join from 10 minutes before the scheduled time until 30 minutes after it. Your browser will ask for microphone access; video is optional.</p><ol className={styles.steps}><li>Use a quiet place and, if possible, headphones.</li><li>Allow your microphone when the call opens. Choose your camera preference in the device check.</li><li>If you disconnect, return here and join again while the room is open.</li></ol><button className={styles.button} onClick={() => void join()} disabled={busy || !data.callsConfigured}>{busy ? "Opening private call…" : data.callsConfigured ? "Join private interview" : "Calls setup in progress"}</button><p className={styles.muted}>Calls are not recorded. There is no chat or public contact information.</p></section>}
    </>}
    {!invite && <Link className={styles.link} href="/account/interviews">← All my interviews</Link>}
    {invite && <p className={styles.muted}>This invitation gives access only to your interview. If it has expired or you need a new time, contact the Budget Worker team that sent it.</p>}
  </div>;
}
