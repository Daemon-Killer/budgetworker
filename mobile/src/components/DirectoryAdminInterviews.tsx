import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, Share, Text, View } from "react-native";
import { request } from "../lib/api";
import {
  formatInterviewTime,
  parseInterviewSlot,
  toSlotDraft,
  validateInterviewBrowserUrl,
  type AdminInterviewView,
  type SlotDraft,
} from "../lib/interviews";
import type { AdminInterviewMutation, AdminInterviewListResponse } from "../../../shared/interviews";
import { Button, Choices, styles } from "./DirectoryUI";
import { InterviewDetails, InterviewSlotFields, useInterviewClock } from "./InterviewFields";

function AdminInterviewCard({ interview, onChanged, now }: {
  interview: AdminInterviewView; onChanged: () => Promise<void>; now: number;
}) {
  const [slot, setSlot] = useState<SlotDraft>(() => toSlotDraft(interview.scheduledAt));
  const [invite, setInvite] = useState<{ url: string; version: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmation, setConfirmation] = useState<AdminInterviewMutation["action"] | null>(null);
  const active = ["REQUESTED", "SCHEDULED", "CONFIRMED"].includes(interview.status);
  const scheduledTime = interview.scheduledAt ? new Date(interview.scheduledAt).getTime() : Infinity;
  const canCompleteNow = now >= scheduledTime;
  const canMarkMissedNow = now >= scheduledTime + 30 * 60_000;
  async function run(work: () => Promise<void>) {
    setBusy(true); setError(""); setNotice("");
    try { await work(); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to update interview"); }
    finally { setBusy(false); }
  }
  async function update(action: AdminInterviewMutation["action"]) {
    const payload: AdminInterviewMutation = { action, version: interview.version };
    if (action === "CONFIRM") payload.scheduledAt = parseInterviewSlot(slot);
    const data = await request<{ interview: AdminInterviewView; workerInviteUrl?: string }>(
      "admin/interviews/" + interview.id, "PATCH", payload,
    );
    setInvite(data.workerInviteUrl ? {
      url: validateInterviewBrowserUrl(data.workerInviteUrl), version: data.interview.version,
    } : null);
    setConfirmation(null);
    await onChanged();
    setNotice(action === "CONFIRM"
      ? "Slot saved. Send the private invitation to this worker manually. The worker still needs to confirm."
      : "Interview updated.");
  }
  async function shareInvite() {
    if (!invite || invite.version !== interview.version) throw Error("The booking changed. Create a new worker invitation before sharing.");
    const text = "Budget Worker interview invitation. Please confirm your availability and join from this private link: " + invite.url;
    if (Platform.OS === "web") {
      if (!navigator.clipboard?.writeText) throw Error("Copy the private link shown below and send it to the worker.");
      await navigator.clipboard.writeText(text);
      setNotice("Private invitation copied. Send it only to this worker.");
    } else {
      await Share.share({ title: "Budget Worker interview", message: text });
    }
  }
  const confirmationText = {
    COMPLETE: "Mark this interview completed only after the conversation took place. This uses the included interview.",
    NO_SHOW: "Mark this slot missed? This keeps the included interview available for another attempt.",
    CANCEL: "Cancel this slot and invalidate its worker invitation? The included interview remains available.",
    RETRY: "Reopen the included interview for a technical failure? The previous slot and invitation will be cleared.",
    CONFIRM: "Save the confirmed slot?",
  };
  return (
    <View style={styles.card}>
      <InterviewDetails interview={interview} />
      <View style={styles.field}>
        <Text style={styles.label}>Private coordination details · admin only</Text>
        <Text selectable style={styles.small}>Family: {interview.familyName || "Family"} · {interview.familyPhone}</Text>
        <Text selectable style={styles.small}>Worker: {interview.workerPhone}</Text>
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {active ? (
        <>
          <Text style={styles.label}>Choose an agreed slot</Text>
          <Text style={styles.small}>Contact the worker first. Saving a slot creates a private invitation; no message is sent automatically.</Text>
          {interview.proposedSlots.map((value) => (
            <Button key={value} title={formatInterviewTime(value)} secondary disabled={busy} onPress={() => setSlot(toSlotDraft(value))} />
          ))}
          <InterviewSlotFields slots={[slot]} single onChange={(slots) => setSlot(slots[0])} />
          <Button title={interview.status === "REQUESTED" ? "Save slot & create worker invite" : "Save slot & replace worker invite"} disabled={busy} onPress={() => void run(() => update("CONFIRM"))} />
          <Text style={styles.small}>Replacing an invitation invalidates the earlier link and requires worker confirmation again.</Text>
        </>
      ) : null}
      {invite && invite.version === interview.version ? (
        <View style={styles.field}>
          <Text style={styles.label}>Private worker invitation</Text>
          <Text selectable style={styles.small}>{invite.url}</Text>
          <Button title={Platform.OS === "web" ? "Copy worker invitation" : "Share worker invitation"} secondary disabled={busy} onPress={() => void run(shareInvite)} />
          <Text style={styles.small}>Send this only to the worker. The family joins from their own booking.</Text>
        </View>
      ) : null}
      {interview.status === "CONFIRMED" ? (
        <>
          <Text style={styles.small}>Complete only after the slot starts and both participants have joined. Completion uses the included interview and cannot be reopened.</Text>
          <Button title="Mark conversation completed" secondary disabled={busy || !canCompleteNow} onPress={() => setConfirmation("COMPLETE")} />
        </>
      ) : null}
      {["SCHEDULED", "CONFIRMED"].includes(interview.status) ? (
        <>
          <Text style={styles.small}>A missed slot can be marked 30 minutes after the scheduled start.</Text>
          <Button title="Mark missed / no-show" secondary disabled={busy || !canMarkMissedNow} onPress={() => setConfirmation("NO_SHOW")} />
        </>
      ) : null}
      {active ? <Button title="Cancel slot" secondary disabled={busy} onPress={() => setConfirmation("CANCEL")} /> : null}
      {["CANCELLED", "NO_SHOW"].includes(interview.status) ? (
        <Button title="Reopen after technical failure" secondary disabled={busy} onPress={() => setConfirmation("RETRY")} />
      ) : null}
      {active ? <Text style={styles.small}>For a technical failure, cancel the slot and reopen it. Do not mark an unfinished conversation completed.</Text> : null}
      {confirmation ? (
        <View style={styles.field}>
          <Text style={styles.small}>{confirmationText[confirmation]}</Text>
          <Button title="Confirm this change" disabled={busy} onPress={() => void run(() => update(confirmation))} />
          <Button title="Keep booking as it is" secondary disabled={busy} onPress={() => setConfirmation(null)} />
        </View>
      ) : null}
    </View>
  );
}

export function DirectoryAdminInterviews() {
  const now = useInterviewClock();
  const [interviews, setInterviews] = useState<AdminInterviewView[]>([]);
  const [callsConfigured, setCallsConfigured] = useState(false);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const data = await request<AdminInterviewListResponse>("admin/interviews");
    setInterviews(data.interviews); setCallsConfigured(data.callsConfigured);
  }, []);
  useEffect(() => {
    let mounted = true;
    request<AdminInterviewListResponse>("admin/interviews")
      .then((d) => { if (mounted) { setInterviews(d.interviews); setCallsConfigured(d.callsConfigured); } })
      .catch((e) => { if (mounted) setError(e instanceof Error ? e.message : "Unable to load interviews"); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);
  async function refresh() {
    setLoading(true); setError("");
    try { await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to refresh interviews"); }
    finally { setLoading(false); }
  }
  const visible = interviews.filter((i) => filter === "all" || i.status === filter);
  return (
    <>
      <Text style={styles.cardTitle}>Interview coordination</Text>
      <Text style={styles.body}>One included interview per unlocked worker. Coordinate availability, send private invitations and record what happened.</Text>
      {!callsConfigured && !loading ? <Text style={styles.notice}>Call service not connected. You can coordinate bookings now; joining stays unavailable until setup is complete.</Text> : null}
      <Button title={loading ? "Refreshing…" : "Refresh interviews"} secondary disabled={loading} onPress={() => void refresh()} />
      <Choices label="Booking status" value={filter} onChange={setFilter} options={[
        ["all", "All"], ["REQUESTED", "Needs scheduling"], ["SCHEDULED", "Worker pending"],
        ["CONFIRMED", "Confirmed"], ["COMPLETED", "Completed"], ["NO_SHOW", "Missed"], ["CANCELLED", "Cancelled"],
      ]} />
      {loading ? <ActivityIndicator color="#204be6" /> : null}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {!loading && !error && !visible.length ? <Text style={styles.small}>No interviews in this view.</Text> : null}
      {visible.map((interview) => <AdminInterviewCard key={interview.id} interview={interview} onChanged={load} now={now} />)}
    </>
  );
}
