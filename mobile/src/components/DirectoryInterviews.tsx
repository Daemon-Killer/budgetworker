import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, AppState, Text, View } from "react-native";
import { request } from "../lib/api";
import {
  openInterviewBrowser,
  outcomeOptions,
  parseProposedSlots,
  type InterviewView,
  type SlotDraft,
} from "../lib/interviews";
import type { DirectoryWorker } from "../../../shared/directory";
import { INTERVIEW_JOIN_EARLY_MINUTES, INTERVIEW_JOIN_END_MINUTES } from "../../../shared/interviews";
import { Button, Choices, Field, styles } from "./DirectoryUI";
import { InterviewDetails, InterviewSlotFields, useInterviewClock } from "./InterviewFields";

const emptySlots = (): SlotDraft[] => Array.from({ length: 3 }, () => ({ date: "", time: "" }));
type Eligibility = { unlocked: boolean; interview: InterviewView | null; callsConfigured: boolean };

export function RequestWorkerInterview({ worker, onViewBookings }: {
  worker: DirectoryWorker;
  onViewBookings: () => void;
}) {
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [slots, setSlots] = useState(emptySlots);
  const [duties, setDuties] = useState("");
  const [schedule, setSchedule] = useState("");
  const [meetingArea, setMeetingArea] = useState([worker.area, worker.city].filter(Boolean).join(", "));
  const [pay, setPay] = useState(worker.payPeriod === "MONTH" && worker.expectedPayInr !== null ? String(worker.expectedPayInr) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setEligibility(await request<Eligibility>("interviews/eligibility?workerId=" + encodeURIComponent(worker.id)));
  }, [worker.id]);
  useEffect(() => {
    let mounted = true;
    request<Eligibility>("interviews/eligibility?workerId=" + encodeURIComponent(worker.id))
      .then((data) => { if (mounted) setEligibility(data); })
      .catch((e) => { if (mounted) setError(e instanceof Error ? e.message : "Unable to check interview access"); });
    return () => { mounted = false; };
  }, [worker.id]);
  async function submit() {
    setBusy(true); setError("");
    try {
      const proposedSlots = parseProposedSlots(slots);
      if (duties.trim().length < 5 || duties.trim().length > 1200 || schedule.trim().length < 2 ||
        schedule.trim().length > 300 || meetingArea.trim().length < 2 || meetingArea.trim().length > 200) {
        throw Error("Describe the duties, working hours and work locality before requesting an interview.");
      }
      if (pay.trim() && (!/^\d+$/.test(pay.trim()) || Number(pay) > 1_000_000)) {
        throw Error("Enter indicative pay as a whole rupee amount, up to ₹10,00,000.");
      }
      await request("interviews", "POST", {
        workerId: worker.id, proposedSlots, duties: duties.trim(), schedule: schedule.trim(),
        meetingArea: meetingArea.trim(), expectedPayInr: pay.trim() ? Number(pay) : null,
      });
      await load(); setShowForm(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to request interview"); }
    finally { setBusy(false); }
  }
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Interview included</Text>
      <Text style={styles.body}>One interview with this worker is included with the unlocked resume. No extra credit is charged.</Text>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {!eligibility && !error ? <ActivityIndicator color="#204be6" /> : null}
      {eligibility?.interview ? (
        <>
          <InterviewDetails interview={eligibility.interview} />
          <Button title="Manage in My interviews" secondary onPress={onViewBookings} />
        </>
      ) : eligibility?.unlocked ? (
        showForm ? (
          <>
            <Text style={styles.small}>Suggest up to three times. Our team will coordinate a 15-minute conversation with the worker.</Text>
            <InterviewSlotFields slots={slots} onChange={setSlots} />
            <Field label="Duties to discuss" value={duties} onChange={setDuties} multiline />
            <Field label="Working hours / days" value={schedule} onChange={setSchedule} />
            <Field label="Work locality (avoid a full home address)" value={meetingArea} onChange={setMeetingArea} />
            <Field label="Indicative monthly pay (₹, optional)" value={pay} onChange={setPay} keyboardType="number-pad" />
            <Button title={busy ? "Requesting…" : "Request included interview"} disabled={busy} onPress={() => void submit()} />
            <Button title="Close request" secondary disabled={busy} onPress={() => setShowForm(false)} />
          </>
        ) : <Button title="Request included interview" onPress={() => setShowForm(true)} />
      ) : eligibility ? <Text style={styles.small}>Unlock this worker’s resume first to request the included interview.</Text> : null}
      {eligibility && !eligibility.callsConfigured ? (
        <Text style={styles.small}>Scheduling is available. Online calls will open after Budget Worker connects its call service.</Text>
      ) : null}
    </View>
  );
}

function FamilyInterviewCard({ interview, callsConfigured, onChanged, now }: {
  interview: InterviewView; callsConfigured: boolean; onChanged: () => Promise<void>; now: number;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [rescheduling, setRescheduling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [slots, setSlots] = useState(emptySlots);
  const [outcome, setOutcome] = useState(interview.outcome ?? "");
  const active = ["REQUESTED", "SCHEDULED", "CONFIRMED"].includes(interview.status);
  const scheduledTime = interview.scheduledAt ? new Date(interview.scheduledAt).getTime() : Infinity;
  const canJoinNow = now >= scheduledTime - INTERVIEW_JOIN_EARLY_MINUTES * 60_000 &&
    now <= scheduledTime + INTERVIEW_JOIN_END_MINUTES * 60_000;
  async function run(work: () => Promise<void>) {
    setBusy(true); setError(""); setNotice("");
    try { await work(); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to update interview"); }
    finally { setBusy(false); }
  }
  async function update(action: "CANCEL" | "RESCHEDULE" | "OUTCOME", extra: Record<string, unknown> = {}) {
    await request("interviews/" + interview.id, "PATCH", { action, version: interview.version, ...extra });
    await onChanged(); setRescheduling(false); setConfirmCancel(false);
  }
  return (
    <View style={styles.card}>
      <InterviewDetails interview={interview} />
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {interview.status === "CONFIRMED" ? (
        <>
          <Text style={styles.small}>The private room opens 10 minutes before your slot and closes 30 minutes after the scheduled start. Camera and microphone permissions are requested in your browser.</Text>
          <Button title="Join interview in browser ↗" disabled={busy || !callsConfigured || !canJoinNow} onPress={() => void run(async () => {
            await openInterviewBrowser(interview.id);
            setNotice("Your secure call opened in the browser. Return here after your conversation and refresh the booking.");
          })} />
        </>
      ) : null}
      {active && !confirmCancel ? (
        <Button title="Cancel interview" secondary disabled={busy} onPress={() => setConfirmCancel(true)} />
      ) : null}
      {confirmCancel ? (
        <>
          <Text style={styles.small}>Cancel this slot? Your included interview remains available until completed.</Text>
          <Button title="Yes, cancel this slot" secondary disabled={busy} onPress={() => void run(() => update("CANCEL"))} />
          <Button title="Keep this slot" secondary disabled={busy} onPress={() => setConfirmCancel(false)} />
        </>
      ) : null}
      {interview.status !== "COMPLETED" && !rescheduling ? (
        <Button title={active ? "Suggest new times" : "Request another time"} secondary disabled={busy} onPress={() => {
          setSlots(emptySlots()); setRescheduling(true); setConfirmCancel(false);
        }} />
      ) : null}
      {rescheduling && interview.status !== "COMPLETED" ? (
        <>
          <Text style={styles.small}>New times need confirmation. Your previous slot and invitation will be replaced.</Text>
          <InterviewSlotFields slots={slots} onChange={setSlots} />
          <Button title={busy ? "Saving…" : "Send new times"} disabled={busy} onPress={() => void run(() => update("RESCHEDULE", { proposedSlots: parseProposedSlots(slots) }))} />
          <Button title="Keep current booking" secondary disabled={busy} onPress={() => setRescheduling(false)} />
        </>
      ) : null}
      {interview.status === "COMPLETED" ? (
        <>
          <Choices label="How did the interview go?" options={outcomeOptions} value={outcome} onChange={setOutcome} />
          <Button title="Save outcome" secondary disabled={busy || !outcome} onPress={() => void run(async () => {
            await update("OUTCOME", { outcome }); setNotice("Interview outcome saved.");
          })} />
          <Text style={styles.small}>This worker’s included interview has been used.</Text>
        </>
      ) : null}
    </View>
  );
}

export function DirectoryInterviews() {
  const now = useInterviewClock();
  const [interviews, setInterviews] = useState<InterviewView[]>([]);
  const [callsConfigured, setCallsConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setError("");
    const d = await request<{ interviews: InterviewView[]; callsConfigured: boolean }>("interviews");
    setInterviews(d.interviews); setCallsConfigured(d.callsConfigured);
  }, []);
  useEffect(() => {
    let mounted = true;
    request<{ interviews: InterviewView[]; callsConfigured: boolean }>("interviews")
      .then((d) => { if (mounted) { setInterviews(d.interviews); setCallsConfigured(d.callsConfigured); } })
      .catch((e) => { if (mounted) setError(e instanceof Error ? e.message : "Unable to load interviews"); })
      .finally(() => { if (mounted) setLoading(false); });
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void load().catch((e) => setError(e instanceof Error ? e.message : "Unable to refresh interviews"));
    });
    return () => { mounted = false; subscription.remove(); };
  }, [load]);
  async function refresh() {
    setLoading(true);
    try { await load(); } catch (e) { setError(e instanceof Error ? e.message : "Unable to refresh interviews"); }
    finally { setLoading(false); }
  }
  return (
    <>
      <Text style={styles.cardTitle}>My interviews</Text>
      <Text style={styles.body}>Each unlocked worker resume includes one interview. Our team confirms a slot with the worker. Rescheduling does not use another credit.</Text>
      <Button title={loading ? "Refreshing…" : "Refresh interviews"} secondary disabled={loading} onPress={() => void refresh()} />
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {loading ? <ActivityIndicator color="#204be6" /> : null}
      {!callsConfigured && !loading && !error ? <Text style={styles.notice}>You can request an interview now. Calls become available when the call service is connected.</Text> : null}
      {!loading && !error && !interviews.length ? <Text style={styles.small}>Open an unlocked worker profile to request your first included interview.</Text> : null}
      {interviews.map((interview) => <FamilyInterviewCard key={interview.id} interview={interview} callsConfigured={callsConfigured} onChanged={load} now={now} />)}
    </>
  );
}
