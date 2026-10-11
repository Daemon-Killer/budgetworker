import { useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";
import { Field, styles } from "./DirectoryUI";
import {
  formatInterviewTime,
  interviewStatusLabels,
  type InterviewView,
  type SlotDraft,
} from "../lib/interviews";

export function useInterviewClock(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 20_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export function InterviewSlotFields({
  slots, onChange, single = false,
}: {
  slots: SlotDraft[];
  onChange: (slots: SlotDraft[]) => void;
  single?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{single ? "Confirmed time" : "Suggested interview times"}</Text>
      <Text style={styles.small}>All times are in India time (IST). Example: 2026-10-20 and 14:30.</Text>
      {slots.map((slot, i) => (
        <View key={i} style={styles.field}>
          <Text style={styles.small}>{single ? "Date and time" : "Option " + (i + 1) + (i ? " · optional" : " · required")}</Text>
          <View style={[styles.row, { alignItems: "flex-start" }]}>
            <View style={{ flex: 1 }}>
              <Field label={(single ? "" : "Option " + (i + 1) + " ") + "date (YYYY-MM-DD)"} value={slot.date}
                placeholder="YYYY-MM-DD" maxLength={10} keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "default"}
                onChange={(date) => onChange(slots.map((s, n) => n === i ? { ...s, date } : s))} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label={(single ? "" : "Option " + (i + 1) + " ") + "time (HH:mm, 24-hour)"} value={slot.time}
                placeholder="14:30" maxLength={5} keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "default"}
                onChange={(time) => onChange(slots.map((s, n) => n === i ? { ...s, time } : s))} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

export function InterviewDetails({ interview }: { interview: InterviewView }) {
  return (
    <>
      <Text style={styles.cardTitle}>{interview.workerName}</Text>
      <Text style={styles.tag}>{interviewStatusLabels[interview.status]}</Text>
      {interview.scheduledAt ? (
        <Text style={styles.body}>{formatInterviewTime(interview.scheduledAt)} · {interview.durationMinutes} minutes</Text>
      ) : interview.proposedSlots.map((slot) => (
        <Text key={slot} style={styles.small}>Suggested: {formatInterviewTime(slot)}</Text>
      ))}
      <Text style={styles.body}>{interview.duties}</Text>
      <Text style={styles.small}>Hours: {interview.schedule}</Text>
      <Text style={styles.small}>Work locality: {interview.meetingArea}</Text>
      {interview.expectedPayInr !== null ? (
        <Text style={styles.small}>Indicative pay: ₹{interview.expectedPayInr.toLocaleString("en-IN")}</Text>
      ) : null}
    </>
  );
}
