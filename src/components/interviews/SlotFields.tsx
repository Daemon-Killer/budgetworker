import styles from "./Interviews.module.css";
import { maximumSlot, minimumSlot, slotIso } from "./InterviewUi";

/** Read the visible fields before a busy render can disable or reset them. */
export function readInterviewSlots(data: FormData) {
  const slots = [0, 1, 2].map(index => String(data.get("slot" + index) || "").trim());
  const selected = slots.filter(Boolean);
  if (selected.length < 2) throw new Error("Please choose at least two interview times.");
  if (new Set(selected).size !== selected.length) throw new Error("Please choose different times for each option.");
  const proposedSlots = selected.map(value => {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error("Please enter a valid date and time for each option.");
    const iso = slotIso(value);
    const time = new Date(iso).getTime();
    if (time < Date.now() + 5 * 60_000) throw new Error("Please choose times at least five minutes from now.");
    if (time > Date.now() + 30 * 24 * 60 * 60_000) throw new Error("Please choose times within the next 30 days.");
    return iso;
  });
  return { slots, proposedSlots };
}

export function SlotFields({ slots, onChange, disabled = false }: { slots: string[]; onChange: (slots: string[]) => void; disabled?: boolean }) {
  return <fieldset className={styles.fields} disabled={disabled}>
    <legend className="font-semibold">When are you available?</legend>
    <p className={styles.muted}>Offer two or three different times. All times are in India Standard Time (IST), even if you are travelling.</p>
    <div className={styles.slotGrid}>{[0, 1, 2].map(index => <label className={styles.field} key={index}>
      Option {index + 1}{index === 2 ? " (optional)" : ""}
      <input name={"slot" + index} type="datetime-local" value={slots[index] || ""} min={minimumSlot()} max={maximumSlot()} required={index < 2} onInput={event => onChange(slots.map((slot, i) => i === index ? event.currentTarget.value : slot))} onChange={event => onChange(slots.map((slot, i) => i === index ? event.target.value : slot))} />
    </label>)}</div>
  </fieldset>;
}
