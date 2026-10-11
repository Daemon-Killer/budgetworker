"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type User = { name: string | null; phone: string };
type Profile = { id?: string; phone?: string; name: string; category: string; employmentType: string; city: string; area: string | null; about: string | null; skill: string | null; whenCanJoin: string | null; experienceYears: number | null; expectedPayInr: number | null; hoursPerDay: number | null; payPeriod: string; status: string; onboardingStatus?: string };
type Invitation = { id: string; familyName: string; status: string; scheduledAt: string | null; proposedSlots: string[]; duties: string; schedule: string; meetingArea: string; expectedPayInr: number | null; durationMinutes: number };
const initial: Profile = { name: "", category: "HOUSEKEEPING", employmentType: "PART_TIME", city: "Pune", area: "", about: "", skill: "", whenCanJoin: "", experienceYears: null, expectedPayInr: null, hoursPerDay: null, payPeriod: "MONTH", status: "AVAILABLE" };
const categories = { HOUSEKEEPING: "Domestic help", ALLROUNDER: "All-round home help", BABYCARE: "Babycare", JAPA: "Mother & newborn care", CHEF: "Specialty chef" };
async function api<T>(path: string, body?: unknown, method = "POST"): Promise<T> {
  const res = await fetch(path, body === undefined ? { cache: "no-store" } : { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Unable to complete this request. Please try again.");
  return data;
}
const date = (value: string) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(value));

export default function WorkerApp() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile>(initial);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [tab, setTab] = useState("home");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState(false);
  const [devCode, setDevCode] = useState<string | undefined>();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadAccount() {
    const account = await api<{ profile: Profile | null; invitations: Invitation[] }>("/api/worker-account");
    setProfile(account.profile || initial); setInvitations(account.invitations);
  }
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const session = await api<{ user: User | null }>("/api/auth/me");
        if (!active) return;
        if (session.user) await loadAccount();
        if (active) setUser(session.user);
      } catch (e) { if (active) setError(e instanceof Error ? e.message : "Could not connect."); }
      finally { if (active) setReady(true); }
    })();
    return () => { active = false; };
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      if (!challenge) {
        const result = await api<{ devCode?: string }>("/api/auth/request-otp", { phone });
        setDevCode(result.devCode); setChallenge(true);
      } else {
        await api("/api/auth/verify-otp", { phone, code });
        const session = await api<{ user: User }>("/api/auth/me");
        await loadAccount(); setTab("home"); setUser(session.user);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Login failed."); }
    finally { setBusy(false); }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const { id, phone: verifiedPhone, onboardingStatus, ...editable } = profile;
      void id; void onboardingStatus; void verifiedPhone;
      const result = await api<{ profile: Profile }>("/api/worker-account", { ...editable, area: editable.area || "", about: editable.about || "", skill: editable.skill || "", whenCanJoin: editable.whenCanJoin || "", status: editable.status === "PLACED" ? "INACTIVE" : editable.status }, "PUT");
      setProfile(result.profile); setNotice(result.profile.onboardingStatus === "PENDING" ? "Profile submitted. The team will review it before publication." : "Your profile has been saved.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save."); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true); setError("");
    try { await api("/api/auth/logout", {}); setUser(null); setTab("home"); setProfile(initial); setInvitations([]); setChallenge(false); setCode(""); setNotice(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not sign out."); }
    finally { setBusy(false); }
  }
  function text(field: keyof Profile) { return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setProfile(p => ({ ...p, [field]: e.target.value })); }
  function number(field: keyof Profile) { return (e: React.ChangeEvent<HTMLInputElement>) => setProfile(p => ({ ...p, [field]: e.target.value === "" ? null : Number(e.target.value) })); }

  const upcoming = invitations.filter(i => !["CANCELLED", "COMPLETED", "DECLINED"].includes(i.status));
  const interviewCards = invitations.length ? invitations.map(i => <article className="card invitation" key={i.id}>
    <div className="card-heading"><span className="avatar">{i.familyName.slice(0, 1)}</span><div><h3>{i.familyName}</h3><p>{i.meetingArea}</p></div><span className="badge">{i.status.replaceAll("_", " ")}</span></div>
    <p className="interview-date">{i.scheduledAt ? date(i.scheduledAt) : "Time to be arranged"} <small>India time · {i.durationMinutes} min</small></p>
    <p>{i.duties}</p><dl><dt>Work schedule</dt><dd>{i.schedule}</dd>{i.expectedPayInr && <><dt>Expected pay</dt><dd>₹{i.expectedPayInr.toLocaleString("en-IN")}</dd></>}</dl>
    {!i.scheduledAt && i.proposedSlots.length > 0 && <div className="slot-list"><strong>Suggested interview times</strong>{i.proposedSlots.filter(s => !Number.isNaN(Date.parse(s))).map(s => <p key={s}>{date(s)} IST</p>)}</div>}
    <p className="muted">The team will coordinate confirmation and share your secure joining link.</p>
  </article>) : <div className="card empty"><span className="empty-icon">↗</span><h3>Your next conversation starts here</h3><p>When a family requests an interview with you, the invitation will appear here.</p></div>;

  return <div className="app"><header className="topbar"><Link href="/" className="brand"><span className="brand-icon">bw</span><span>BudgetWorker<small>FOR WORKERS</small></span></Link><span className="top-note">Your work. Your next step.</span>{user && <button className="text-button" onClick={logout} disabled={busy}>Sign out</button>}</header>
    {!ready ? <main className="loading" role="status">Opening your workspace…</main> : !user ? <main className="welcome"><section className="welcome-copy"><span className="eyebrow">A LITTLE HELP WITH YOUR NEXT OPPORTUNITY</span><h1>Good work starts<br />with <em>you.</em></h1><p>Create your profile, tell us when you’re available, and keep your interview invitations in one place.</p><div className="welcome-benefits"><p><span>01</span> Let families discover your skills</p><p><span>02</span> Choose your work preferences</p><p><span>03</span> Stay ready for your next interview</p></div><span className="welcome-caption">Built for cooks, caregivers and home-help professionals.</span></section><section className="card login"><span className="eyebrow">YOUR WORKER ACCOUNT</span><h2>{challenge ? "Check your phone" : "Let’s get started"}</h2><p>{challenge ? `Enter the code for ${phone}.` : "Sign in or register with your mobile number."}</p><form onSubmit={login}>{challenge ? <label>Verification code<input autoComplete="one-time-code" inputMode="numeric" required value={code} onChange={e => setCode(e.target.value)} /></label> : <label>Mobile number<div className="phone-input"><span>+91</span><input autoComplete="tel-national" inputMode="tel" pattern="[0-9]{10}" maxLength={10} required placeholder="10-digit mobile number" value={phone} onChange={e => setPhone(e.target.value)} /></div></label>}{devCode && <p className="notice">Local test code: {devCode}</p>}{error && <p className="error" role="alert">{error}</p>}<button className="primary" disabled={busy}>{busy ? "Please wait…" : challenge ? "Verify & continue →" : "Send verification code →"}</button>{challenge && <button type="button" className="text-button" disabled={busy} onClick={() => { setChallenge(false); setCode(""); setError(""); setDevCode(undefined); }}>Use a different number</button>}</form><p className="fine-print">A verified phone keeps your account secure. Registration is free.</p></section></main> : <div className="workspace"><aside><p className="eyebrow">MY WORKSPACE</p><nav aria-label="Worker workspace">{[["home", "Overview", "◈"], ["profile", "My profile", "◉"], ["interviews", "Interviews", "↗"]].map(([key, label, icon]) => <button key={key} className={tab === key ? "active" : ""} aria-current={tab === key ? "page" : undefined} onClick={() => { setTab(key); setError(""); setNotice(""); }}><span>{icon}</span>{label}</button>)}</nav><div className="sidebar-help"><strong>A profile that feels like you.</strong><p>Keep your skills and availability up to date so the team can find the right fit.</p></div><p className="account-phone">+91 {user.phone}</p></aside><main className="content">
      <div className="page-heading"><span className="eyebrow">{tab === "profile" ? "TELL YOUR STORY" : tab === "interviews" ? "YOUR NEXT OPPORTUNITY" : "A FRESH START"}</span><h1>{tab === "profile" ? "My work profile" : tab === "interviews" ? "Interview invitations" : `Hello, ${(profile.name || user.name || "there").split(" ")[0]}.`}</h1><p>{tab === "profile" ? "Your skills, preferences and availability, all in one place." : tab === "interviews" ? "Review families’ requests and upcoming conversations." : "Let’s make your next opportunity a good one."}</p></div>
      {error && <p className="error" role="alert">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}
      {tab === "home" && <><section className="hero-panel"><div><span className="eyebrow">{profile.id ? "YOU’RE ON YOUR WAY" : "FIRST, INTRODUCE YOURSELF"}</span><h2>{profile.id ? "Your next chapter is taking shape." : "Put your skills in the spotlight."}</h2><p>{profile.id ? "Check your profile and keep the team informed about your work preferences." : "Tell us what you do best. The team will review your profile before families can discover it."}</p><button className="primary" onClick={() => setTab("profile")}>{profile.id ? "Update my profile" : "Create my profile"} →</button></div><div className="hero-art" aria-hidden="true"><span>✦</span><strong>Made<br />for you.</strong></div></section><section className="stats"><div className="card"><span>Profile status</span><strong>{profile.id ? profile.onboardingStatus === "APPROVED" ? "Approved" : "Under review" : "Not created"}</strong><small>{profile.id ? "Managed by the BudgetWorker team" : "Complete your profile to get started"}</small></div><div className="card"><span>Availability</span><strong>{profile.status === "PLACED" ? "Currently placed" : profile.status === "INACTIVE" ? "Taking a break" : "Ready for work"}</strong><small>You choose when you’re available</small></div><div className="card"><span>Active invitations</span><strong>{upcoming.length.toString().padStart(2, "0")}</strong><small>Conversations about your next role</small></div></section><div className="section-heading"><h2>Interview invitations</h2><button className="text-button" onClick={() => setTab("interviews")}>View all →</button></div>{interviewCards}</>}
      {tab === "interviews" && <><button className="text-button refresh" disabled={busy} onClick={async () => { setBusy(true); setError(""); try { await loadAccount(); } catch (e) { setError(e instanceof Error ? e.message : "Refresh failed."); } finally { setBusy(false); } }}>Refresh invitations ↻</button>{interviewCards}</>}
      {tab === "profile" && <form className="card profile-form" onSubmit={save}><div className="section-heading"><h2>A little about you</h2><span className="badge">{profile.id ? profile.onboardingStatus : "NEW PROFILE"}</span></div><p className="muted">Verified mobile: +91 {user.phone}. Approval and verification are managed by the team.</p><div className="form-grid"><label>Full name<input required minLength={2} maxLength={100} value={profile.name} onChange={text("name")} /></label><label>Type of work<select value={profile.category} onChange={text("category")}>{!(profile.category in categories) && <option value={profile.category} disabled>Choose an active work type</option>}{Object.entries(categories).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label><label>City<input required minLength={2} maxLength={100} value={profile.city} onChange={text("city")} /></label><label>Area / locality<input maxLength={100} value={profile.area || ""} onChange={text("area")} /></label><label>Work arrangement<select value={profile.employmentType} onChange={text("employmentType")}><option value="PART_TIME">Part-time</option><option value="FULL_TIME">Full-time</option><option value="LIVE_IN">Live-in</option></select></label><label>Years of experience<input type="number" min={0} max={80} value={profile.experienceYears ?? ""} onChange={number("experienceYears")} /></label><label>Expected pay (₹)<input type="number" min={1} max={1000000} value={profile.expectedPayInr ?? ""} onChange={number("expectedPayInr")} /></label><label>Pay period<select value={profile.payPeriod} onChange={text("payPeriod")}><option value="MONTH">Per month</option><option value="DAY">Per day</option><option value="HOUR">Per hour</option></select></label><label>Available hours per day<input type="number" min={0.5} max={24} step={0.5} value={profile.hoursPerDay ?? ""} onChange={number("hoursPerDay")} /></label><label>When can you start?<input maxLength={100} placeholder="For example, immediately" value={profile.whenCanJoin || ""} onChange={text("whenCanJoin")} /></label></div><label>Your skills<textarea maxLength={1000} placeholder="What do you do best?" value={profile.skill || ""} onChange={text("skill")} /></label><label>About you<textarea maxLength={2000} placeholder="Tell us about your experience and the work you enjoy." value={profile.about || ""} onChange={text("about")} /></label><fieldset className="availability"><legend>My availability</legend>{profile.status === "PLACED" ? <p>Your placement is managed by the team. Contact them when you’re ready for a new role.</p> : <div className="availability-options">{[["AVAILABLE", "Ready for work", "The team can consider me for opportunities"], ["INACTIVE", "Taking a break", "I’m not looking for work right now"]].map(([key, title, subtitle]) => <label key={key}><input type="radio" name="availability" checked={profile.status === key} onChange={() => setProfile(p => ({ ...p, status: key }))} /><span><strong>{title}</strong><small>{subtitle}</small></span></label>)}</div>}</fieldset><p className="fine-print">By saving, you agree that BudgetWorker may contact you about your profile and work opportunities. Registration does not guarantee a job.</p><button className="primary" disabled={busy}>{busy ? "Saving…" : profile.id ? "Save my profile →" : "Submit for review →"}</button></form>}
    </main></div>}<footer>BudgetWorker for workers <span>One step closer to work that fits.</span></footer></div>;
}



