"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ServiceCard } from "@/lib/services";
import { plansForService, SERVICE_DUTIES } from "@/lib/service-plans";
import { bookingAnswersSchema, todayInIndia, type BookingAnswers } from "@/lib/service-booking-input";
import { loadRazorpayScript, type RazorpaySuccessResponse } from "@/lib/load-razorpay";
import styles from "./BookingForm.module.css";
import { domesticSalaryEstimate, workerSalaryEstimate } from "@/lib/worker-salary-estimates";

const STEPS = ["Location", "Your needs", "Schedule", "Subscription", "Review"];
const cities = ["Delhi", "Gurgaon", "Noida", "Faridabad", "Ghaziabad", "Mumbai", "Navi Mumbai", "Thane", "Pune"];
const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;

export function BookingForm({ service, loggedIn, customerName, phone, initialBooking }: {
  service: ServiceCard; loggedIn: boolean; customerName: string; phone: string; initialBooking?: { answers: BookingAnswers; planId: string; requestId: string };
}) {
  const router = useRouter();
  const liveIn = service.employmentType === "LIVE_IN";
  const partTimeJapa = service.category === "JAPA" && !liveIn;
  const showHousehold = service.category !== "BABYCARE" && !partTimeJapa;
  const babycare = ["BABYCARE", "JAPA"].includes(service.category);
  const domesticHelp = service.category === "HOUSEKEEPING";
  const cooking = service.category === "ALLROUNDER";
  const [answers, setAnswers] = useState<BookingAnswers>(initialBooking?.answers ?? {
    city: "", area: "", address: "", pincode: "", duties: [], homeSize: service.slug === "domestic-help" ? "1 BHK" : "2 BHK", ...(service.slug === "domestic-help" ? { numberOfFloors: "1" as const, dustingDuration: "30 minutes" as const, moppingMethod: "Smart mop/wiper" as const } : {}), ...(liveIn && domesticHelp ? { numberOfFloors: "1" as const } : {}), familyMembers: 3, bathrooms: service.slug === "domestic-help" ? 1 : 2,
    pets: "No pets", babyType: "single", childAge: service.category === "JAPA" ? partTimeJapa ? "0–2 months" : "Newborn" : babycare ? "2–6 months" : "Not applicable", foodPreference: cooking ? "Vegetarian" : "Not applicable",
    dailyHours: liveIn ? 24 : service.slug === "domestic-help" || partTimeJapa ? 1 : service.category === "BABYCARE" ? 7 : 8, startTime: "09:00", weeklyOff: "Flexible", accommodation: liveIn ? "Private room" : "Not applicable",
    startDate: "", language: "No preference", name: customerName, notes: "",
  });
  const [step, setStep] = useState(initialBooking ? 4 : 0);
  const [planId, setPlanId] = useState(initialBooking?.planId ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [bookingId, setBookingId] = useState("");
  const [testMode, setTestMode] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const attempt = useRef({ signature: initialBooking ? JSON.stringify({ answers: bookingAnswersSchema.safeParse(initialBooking.answers).data ?? initialBooking.answers, planId: initialBooking.planId }) : "", requestId: initialBooking?.requestId ?? "" });
  const draftKey = `bw-service-booking-${service.slug}`;
  const plans = plansForService(service.slug, answers.babyType);
  const selected = plans.find(plan => plan.id === planId);
  const salaryEstimate = workerSalaryEstimate(service, answers);
  const domesticEstimate = service.slug === "domestic-help" ? domesticSalaryEstimate(answers) : null;

  useEffect(() => {
    // Restore the completed review after OTP login; never send drafts to the server.
    if (initialBooking) return;
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      const parsed = bookingAnswersSchema.safeParse(saved.answers);
      if (!parsed.success || Date.now() - saved.savedAt > 2 * 60 * 60 * 1000) { sessionStorage.removeItem(draftKey); return; }
      if (!plansForService(service.slug, parsed.data.babyType).some(plan => plan.id === saved.planId)) return;
      setAnswers(partTimeJapa && ["Newborn", "Under 1 year"].includes(parsed.data.childAge) ? { ...parsed.data, childAge: "0–2 months" } : service.category === "BABYCARE" && ["Newborn", "Under 1 year"].includes(parsed.data.childAge) ? { ...parsed.data, childAge: "2–12 months" } : parsed.data);
      setPlanId(saved.planId);
      setStep(4);
    } catch { /* Booking still works when browser storage is disabled. */ }
  }, [draftKey, service.slug, service.category, partTimeJapa, initialBooking]);

  function update<K extends keyof BookingAnswers>(key: K, value: BookingAnswers[K]) {
    setAnswers(current => ({ ...current, [key]: value }));
    if (key === "babyType") setPlanId("");
    setError("");
  }
  function move(next: number) {
    setStep(next); setError("");
    requestAnimationFrame(() => { titleRef.current?.focus(); titleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); });
  }
  function select<K extends keyof BookingAnswers>(key: K, label: string, options: readonly string[]) {
    return <label className={styles.field} key={key} htmlFor={key}><span>{label}</span><select id={key} value={String(answers[key] ?? (key === "dustingDuration" ? "30 minutes" : key === "moppingMethod" ? "Smart mop/wiper" : ""))} onChange={event => update(key, event.target.value as BookingAnswers[K])}>{key === "childAge" && answers.childAge === "2–12 months" && !options.includes("2–12 months") && <option value="2–12 months">2–12 months (previous selection)</option>}{key === "homeSize" && answers.homeSize === "5+ BHK" && !options.includes("5+ BHK") && <option value="5+ BHK">5+ BHK (previous selection)</option>}{options.map(value => <option key={value}>{value}</option>)}</select></label>;
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (step === 1 && !answers.duties.length) { setError("Select at least one duty."); return; }
    if (step < 4) { move(step + 1); return; }
    const parsed = bookingAnswersSchema.safeParse(answers);
    if (!parsed.success || !selected) { setError(parsed.success ? "Choose a subscription plan." : parsed.error.issues[0].message); return; }
    if (!loggedIn) {
      try { sessionStorage.setItem(draftKey, JSON.stringify({ answers: parsed.data, planId, savedAt: Date.now() })); }
      catch { setError("Allow browser storage to keep your answers while you log in."); return; }
      router.push(`/login?next=${encodeURIComponent(`/services/${service.slug}/book`)}`); return;
    }
    setLoading(true);
    try {
      const signature = JSON.stringify({ answers: parsed.data, planId });
      if (attempt.current.signature !== signature) attempt.current = { signature, requestId: crypto.randomUUID() };
      const res = await fetch("/api/service-bookings", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: attempt.current.requestId, serviceSlug: service.slug, planId, answers: parsed.data }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start your booking");
      if (data.status !== "PAID") {
        const isTest = String(data.keyId).startsWith("rzp_test_"); setTestMode(isTest);
        if (!(await loadRazorpayScript()) || !window.Razorpay) throw new Error("Could not load checkout. Please retry.");
        await new Promise<void>((resolve, reject) => {
          const checkout = new window.Razorpay!({
            key: data.keyId, order_id: data.razorpayOrderId, amount: data.amountPaise, currency: "INR", name: "BudgetWorker",
            description: `${service.title} · ${selected.months}-month subscription`, prefill: { contact: phone, name: answers.name }, theme: { color: "#075caf" },
            handler: async (response: RazorpaySuccessResponse) => {
              try {
                const verified = await fetch("/api/orders/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: data.orderId, ...response }) });
                const result = await verified.json(); if (!verified.ok) throw new Error(result.error || "Payment could not be verified"); resolve();
              } catch (failure) { reject(failure); }
            }, modal: { ondismiss: () => reject(new Error("Payment cancelled. Your pending booking is saved; retry to finish payment.")) },
          });
          checkout.on("payment.failed", () => reject(new Error("Payment failed. Please retry your booking.")));
          checkout.open();
        });
      } else if (data.testMode) setTestMode(true);
      setBookingId(data.bookingId);
      try { sessionStorage.removeItem(draftKey); } catch { /* Payment has already been verified. */ }
      router.refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not complete booking"); }
    finally { setLoading(false); }
  }

  if (bookingId) return <section className={styles.panel} role="status"><h2 className={styles.heading}>{testMode ? "Test booking saved" : "Subscription payment confirmed"}</h2>
    <p>{testMode ? "This was a test checkout. No real money was charged." : "Your booking details and payment have been saved."}</p>
    <p>Our team will confirm worker availability, duties and the joining date with you.</p><p className={styles.reference}>Booking reference: {bookingId}</p>
    <Link href="/bookings" className="bw-button">View my bookings</Link></section>;

  return <div className={styles.layout}>
    <div>
      <ol className={styles.progress} aria-label="Booking steps">{STEPS.map((label, index) => <li key={label} aria-current={index === step ? "step" : undefined}><span>{index + 1}</span>{label}</li>)}</ol>
      <form className={styles.panel} onSubmit={submit}>
        <p className={styles.kicker}>Step {step + 1} of {STEPS.length} · {liveIn ? "24-hour Live-in" : "Part-time"}</p>
        <h2 ref={titleRef} tabIndex={-1} className={styles.heading}>{["Where do you need help?", "What should your helper do?", "When do you need help?", "Choose your subscription", "Review your booking"][step]}</h2>
        {step === 0 && <div className={styles.fields}>
          <label className={styles.field} htmlFor="city"><span>City</span><input id="city" list="booking-cities" required minLength={2} maxLength={80} value={answers.city} onChange={e => update("city", e.target.value)} autoComplete="address-level2" /></label>
          <datalist id="booking-cities">{cities.map(city => <option key={city} value={city} />)}</datalist>
          <label className={styles.field} htmlFor="area"><span>Area / locality</span><input id="area" required minLength={2} maxLength={100} value={answers.area} onChange={e => update("area", e.target.value)} /></label>
          <label className={`${styles.field} ${styles.wide}`} htmlFor="address"><span>House / apartment address</span><input id="address" required minLength={5} maxLength={300} value={answers.address} onChange={e => update("address", e.target.value)} autoComplete="street-address" /></label>
          <label className={styles.field} htmlFor="pincode"><span>Pincode</span><input id="pincode" required inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} value={answers.pincode} onChange={e => update("pincode", e.target.value)} autoComplete="postal-code" /></label>
        </div>}
        {step === 1 && <>
          <fieldset className={styles.duties}><legend>Select the duties you need</legend>{SERVICE_DUTIES[service.category].filter(duty => service.slug !== "domestic-help" || duty !== "Laundry & folding" || answers.duties.includes(duty)).map(duty => <label key={duty}><input type="checkbox" checked={answers.duties.includes(duty)} onChange={e => update("duties", e.target.checked ? [...answers.duties, duty] : answers.duties.filter(value => value !== duty))} />{service.slug === "domestic-help" ? ({ "Sweeping & mopping": "Brooming & mopping", "Dusting & tidying": "Dusting", "Utensil cleaning": "Dishwashing" } as Record<string,string>)[duty] ?? duty : duty}</label>)}</fieldset>
          <div className={styles.fields}>
            {showHousehold && select("homeSize", "Home size", service.slug === "domestic-help" ? ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "5 BHK", "6 BHK"] : ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "5+ BHK"])}
            {domesticHelp && <label className={styles.field} htmlFor="numberOfFloors"><span>Number of floors to clean</span><select id="numberOfFloors" value={answers.numberOfFloors ?? "1"} onChange={e => update("numberOfFloors", e.target.value as BookingAnswers["numberOfFloors"])}>{["1", "2", "3", "4", "5+"].map(value => <option key={value} value={value}>{value} {value === "1" ? "floor" : "floors"}</option>)}</select></label>}
            {showHousehold && <label className={styles.field} htmlFor="familyMembers"><span>People in your home</span><input id="familyMembers" type="number" required min={1} max={30} value={answers.familyMembers} onChange={e => update("familyMembers", Number(e.target.value))} /></label>}
            {showHousehold && <label className={styles.field} htmlFor="bathrooms"><span>Number of bathrooms</span><input id="bathrooms" type="number" required min={1} max={10} value={answers.bathrooms} onChange={e => update("bathrooms", Number(e.target.value))} /></label>}
            {service.slug === "domestic-help" && answers.duties.includes("Sweeping & mopping") && select("moppingMethod", "Mopping method", ["Smart mop/wiper", "Hands only"])}
            {service.slug === "domestic-help" && answers.duties.includes("Dusting & tidying") && select("dustingDuration", "Dusting time per day", ["30 minutes", "1 hour", "1.5 hours", "2 hours"])}
            {select("pets", "Pets at home", ["No pets", "Dog", "Cat", "Other pets"])}
            {babycare && <><label className={styles.field} htmlFor="babyType"><span>Care for</span><select id="babyType" value={answers.babyType} onChange={e => update("babyType", e.target.value as "single" | "twins")}><option value="single">Single baby</option><option value="twins">Twins</option></select></label>{select("childAge", "Baby / child age", service.category === "JAPA" ? partTimeJapa ? ["0–2 months"] : ["Newborn", "Under 1 year"] : ["2–6 months", "6–12 months", "1–3 years", "4–6 years", "7+ years"])}</>}
            {cooking && select("foodPreference", "Cooking preference", ["Vegetarian", "Non-vegetarian", "Both"])}
          </div>
          <p className={styles.note}>Final duties will be agreed with the worker before joining.</p>
        </>}
        {step === 2 && <div className={styles.fields}>
          {!liveIn && service.slug !== "domestic-help" && <label className={styles.field} htmlFor="dailyHours"><span>Hours per day</span><select id="dailyHours" value={answers.dailyHours} onChange={e => update("dailyHours", Number(e.target.value))}>{(partTimeJapa ? [1,2,3,4,5,6,7,8,9,10,11] : service.category === "BABYCARE" ? [7,8,9,10,11] : [2,3,4,5,6,7,8,9,10,11]).map(hours => <option key={hours} value={hours}>{hours} hours</option>)}</select></label>}
          {!liveIn && <label className={styles.field} htmlFor="startTime"><span>Daily start time</span><input id="startTime" type="time" required value={answers.startTime} onChange={e => update("startTime", e.target.value)} /></label>}
          {liveIn && <><p className={styles.note}>Live-in means the worker stays at your home. Daily duties, rest time and weekly off are agreed before joining.</p>{select("accommodation", "Accommodation for the worker", ["Private room", "Shared room"])}</>}
          {!liveIn && service.slug !== "domestic-help" && select("weeklyOff", "Preferred weekly off", ["Flexible", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"])}
          <label className={styles.field} htmlFor="startDate"><span>Preferred joining date</span><input id="startDate" type="date" required min={todayInIndia()} value={answers.startDate} onChange={e => update("startDate", e.target.value)} /></label>
          {select("language", "Preferred language", ["No preference", "Hindi", "English", "Marathi", "Bengali", "Tamil", "Telugu"])}
          <label className={styles.field} htmlFor="name"><span>Your name</span><input id="name" required minLength={2} maxLength={100} autoComplete="name" value={answers.name} onChange={e => update("name", e.target.value)} /></label>
          <label className={`${styles.field} ${styles.wide}`} htmlFor="notes"><span>Anything else we should know? (optional)</span><textarea id="notes" rows={3} maxLength={1000} value={answers.notes} onChange={e => update("notes", e.target.value)} /></label>
        </div>}
        {step === 3 && <>
          {service.category === "JAPA" && <p className={styles.note}>{answers.babyType === "twins" ? "Twins" : "Single baby"} · {liveIn ? "24-hour Live-in" : "Part-time"}</p>}
          <fieldset className={styles.plans}><legend className={styles.srOnly}>Subscription duration</legend>{plans.map(plan => <label key={plan.id} data-service-plan={plan.id} className={planId === plan.id ? styles.selected : ""}>
            <input type="radio" name="plan" value={plan.id} required checked={planId === plan.id} onChange={() => setPlanId(plan.id)} />
            <span><strong>{plan.months} {plan.months === 1 ? "month" : "months"}</strong><b>{money(plan.priceInr)} <span data-gst-label style={{ fontSize: "0.5em", display: "inline", whiteSpace: "nowrap" }}>+ GST</span></b><small>{plan.replacements} {plan.replacements === 1 ? "replacement" : "replacements"} included</small></span>
          </label>)}</fieldset>
          <p className={styles.note}>Subscription fee for the selected duration. Worker salary is paid separately. No automatic renewal.</p>
        </>}
        {step === 4 && <>
          <dl className={styles.review}>
            <div><dt>Service</dt><dd>{service.title}{babycare ? ` · ${answers.babyType === "twins" ? "Twins" : "Single baby"}` : ""}</dd></div>
            <div><dt>Location</dt><dd>{answers.address}, {answers.area}, {answers.city} – {answers.pincode}</dd></div>
            <div><dt>Duties</dt><dd>{answers.duties.join(", ")}</dd></div>
            {domesticHelp && answers.numberOfFloors && <div><dt>Number of floors to clean</dt><dd>{answers.numberOfFloors} {answers.numberOfFloors === "1" ? "floor" : "floors"}</dd></div>}
            {service.slug === "domestic-help" && answers.duties.includes("Sweeping & mopping") && <div><dt>Mopping method</dt><dd>{answers.moppingMethod ?? "Smart mop/wiper"}</dd></div>}
            {service.slug === "domestic-help" && answers.duties.includes("Dusting & tidying") && <div><dt>Dusting time per day</dt><dd>{answers.dustingDuration ?? "30 minutes"}</dd></div>}
            {!showHousehold ? <div><dt>Pets at home</dt><dd>{answers.pets}</dd></div> : <div><dt>Household</dt><dd>{answers.homeSize} · {answers.familyMembers} people · {answers.bathrooms} bathrooms · {answers.pets}</dd></div>}
            {babycare && <div><dt>Baby / child age</dt><dd>{answers.childAge}</dd></div>}
            {cooking && <div><dt>Cooking preference</dt><dd>{answers.foodPreference}</dd></div>}
            <div><dt>Schedule</dt><dd>{liveIn ? `24-hour Live-in · ${answers.accommodation}`  : service.slug === "domestic-help" ? `Start time: ${answers.startTime}` : `${answers.dailyHours} hours/day · ${answers.startTime}`}{!liveIn && service.slug !== "domestic-help" && ` · Weekly off: ${answers.weeklyOff}`}</dd></div>
            <div><dt>Joining date</dt><dd>{answers.startDate}</dd></div>
            <div><dt>Language</dt><dd>{answers.language}</dd></div>
            <div><dt>Contact</dt><dd>{answers.name}{phone ? ` · ${phone}` : " · Mobile number verified at login"}</dd></div>
            {answers.notes && <div><dt>Other requirements</dt><dd>{answers.notes}</dd></div>}
            {selected && <div><dt>Subscription fee</dt><dd><strong>{money(selected.priceInr)} <span data-gst-label style={{ fontSize: "0.5em", display: "inline", whiteSpace: "nowrap" }}>+ GST</span></strong> · {selected.months} {selected.months === 1 ? "month" : "months"} · {selected.replacements} {selected.replacements === 1 ? "replacement" : "replacements"}</dd></div>}
          </dl>
          <label className={styles.consent}><input type="checkbox" required />I understand this is the subscription service fee. Worker salary is separate. Worker availability, duties and joining date will be confirmed by the team.</label>
        </>}
        {error && <p role="alert" className={styles.error}>{error}</p>}
        {testMode && <p role="status" className={styles.note}>Test checkout: no real money is charged.</p>}
        <div className={styles.actions}>{step > 0 && <button type="button" className="bw-button secondary" disabled={loading} onClick={() => move(step - 1)}>Back</button>}
          <button type="submit" className="bw-button" disabled={loading}>{loading ? "Opening checkout…" : step < 4 ? "Continue" : loggedIn ? `Pay ${selected ? money(selected.priceInr) : "subscription fee"}` : "Log in to continue"}</button>
        </div>
        {(!liveIn || salaryEstimate) && <section data-worker-salary-estimate className={styles.note} aria-label="Approximate worker salary">
          <h3 className="text-base font-semibold text-slate-900">Approximate monthly worker salary</h3>
          {partTimeJapa && <p data-japa-base-rate className="mt-2">For 1 hour/day: Single baby ₹2,800/month · Twins ₹3,200/month. Your estimate updates with the selected daily hours.</p>}
          <p className="mt-2 text-lg font-bold text-blue-800">{salaryEstimate ? salaryEstimate[0] === salaryEstimate[1] ? `${money(salaryEstimate[0])}/month approx.` : `${money(salaryEstimate[0])}–${money(salaryEstimate[1])}/month approx.` : service.slug === "domestic-help" && !answers.duties.length ? "Select your duties to see the salary estimate." : "The team will confirm an estimate for these hours and duties."}</p>
          {domesticEstimate ? <>
            <ul className="mt-2 space-y-1">{domesticEstimate.items.map(item => <li key={item.name}>{item.name}: {money(item.amount)}/month</li>)}</ul>
            <p data-domestic-salary-hours className="mt-2">Estimated task time: {domesticEstimate.totalHours} hours/day. Salary is based on selected tasks and their duration.</p>
            {domesticEstimate.usesDelhiReference && <p className="mt-2">Delhi reference rates are used for this location; the team confirms the local salary.</p>}
            <p className="mt-2">Start time, home size, floors, bathrooms, family size and dusting duration affect the estimate. The 5+ floors option uses 5 floors until the team confirms the exact count.</p>
            <p className="mt-2">Approximate worker salary, paid separately from subscription and resume booking fees. Final working hours and salary are confirmed before joining.</p>
          </> : liveIn ? <p className="mt-2">24-hour Live-in · {answers.babyType === "twins" ? "Twins" : "Single baby"} · {answers.childAge}. Approximate worker salary, paid separately from subscription and resume booking fees. Final salary is confirmed before joining.</p> : babycare ? <p className="mt-2">{answers.babyType === "twins" ? "Twins" : "Single baby"} · {answers.dailyHours} hours/day × {money(partTimeJapa ? answers.babyType === "twins" ? 3200 : 2800 : answers.babyType === "twins" ? 2500 : 2100)} per daily working hour/month. Approximate worker salary, paid separately from subscription and resume booking fees. Final salary is confirmed before joining.</p> : <p className="mt-2">{service.slug !== "domestic-help" && `${answers.dailyHours} hours/day. `} {service.category !== "JAPA" && "Delhi NCR reference; "}Final salary depends on your city, duties, experience and worker availability. Paid separately from subscription and resume booking fees.</p>}
        </section>}
      </form>
    </div>
    <aside className={styles.summary} aria-label="Booking summary"><p className={styles.kicker}>Your service</p><h2>{service.title}</h2><p>{liveIn ? "24-hour Live-in" : "Part-time"}{babycare ? ` · ${answers.babyType === "twins" ? "Twins" : "Single baby"}` : ""}</p>
      {selected ? <><strong>{money(selected.priceInr)} <span data-gst-label style={{ fontSize: "0.5em", display: "inline", whiteSpace: "nowrap" }}>+ GST</span></strong><p>{selected.months} {selected.months === 1 ? "month" : "months"} subscription</p><p>{selected.replacements} {selected.replacements === 1 ? "replacement" : "replacements"} included during this period</p></> : <p>Plans from <b>{money(Math.min(...plans.map(plan => plan.priceInr)))} <span data-gst-label style={{ fontSize: "0.5em", display: "inline", whiteSpace: "nowrap" }}>+ GST</span></b></p>}
      <p className={styles.note}>Worker salary is separate. Resume + interview booking plans are a separate offering.</p>
      <Link href="/bookings">My bookings →</Link>
    </aside>
  </div>;
}
