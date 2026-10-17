"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type Profile = {
  id?: string;
  phone?: string;
  age?: number | null;
  name: string;
  category: string;
  employmentType: string;
  city: string;
  area: string | null;
  about: string | null;
  skill: string | null;
  whenCanJoin: string | null;
  experienceYears: number | null;
  expectedPayInr: number | null;
  hoursPerDay: number | null;
  payPeriod: string;
  status: string;
  onboardingStatus?: string;
};
type Job = {
  id: string;
  title: string;
  category: string;
  description: string;
  city: string;
  area: string;
  payInr: number;
  payPeriod: string;
  schedule: string;
  status: string;
  employmentType: string;
};
type Application = {
  id: string;
  status: string;
  job: Job;
  contactPhone?: string;
};
type Invitation = {
  id: string;
  familyName: string;
  status: string;
  scheduledAt: string | null;
  duties: string;
  schedule: string;
  meetingArea: string;
};
type Document = { id: string; kind: string; status: string };
type Support = { id: string; topic: string; message: string; status: string };
type Account = {
  profile: Profile | null;
  invitations: Invitation[];
  documents: Document[];
  verification: { aadhaarVerified: boolean; policeVerified: boolean } | null;
  supportRequests: Support[];
};
type Tab =
  | "home"
  | "jobs"
  | "current"
  | "help"
  | "profile"
  | "documents"
  | "detail"
  | "duty"
  | "interviews";
const initial: Profile = {
  name: "",
  age: null,
  category: "HOUSEKEEPING",
  employmentType: "PART_TIME",
  city: "",
  area: "",
  about: "",
  skill: "",
  whenCanJoin: "",
  experienceYears: null,
  expectedPayInr: null,
  hoursPerDay: null,
  payPeriod: "MONTH",
  status: "AVAILABLE",
};
const categories = [
  ["HOUSEKEEPING", "घरेलू काम", "Domestic Help"],
  ["BABYCARE", "बच्चों की देखभाल", "Babycare"],
  ["ALLROUNDER", "ऑल-राउंडर", "All-Rounder"],
  ["JAPA", "जापा केयर", "Japa Care"],
];
const topics = [
  ["CLIENT", "क्लाइंट से समस्या है", "Issue with client"],
  ["SALARY", "सैलरी नहीं मिली", "Salary not received"],
  ["EXTRA_WORK", "अतिरिक्त काम कराया जा रहा है", "Extra work requested"],
  ["LEAVE", "छुट्टी चाहिए", "Request leave"],
  ["QUIT", "जॉब छोड़नी है", "Leave my job"],
  ["OTHER", "अन्य समस्या", "Something else"],
];
async function api<T>(
  path: string,
  body?: unknown,
  method = "POST",
): Promise<T> {
  const res = await fetch(
    path,
    body === undefined
      ? { cache: "no-store", signal: AbortSignal.timeout(20000) }
      : {
          method,
          signal: AbortSignal.timeout(20000),
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "Please try again / दोबारा कोशिश करें");
  return data;
}
function Logo({ large = false }: { large?: boolean }) {
  return (
    <div className={`brand ${large ? "brand-large" : ""}`}>
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path
          d="M7 29 32 7l25 22M48 12v12"
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="23" cy="32" r="7" fill="#087eaa" />
        <circle cx="43" cy="32" r="7" fill="#199b62" />
        <path
          d="M10 56c0-23 26-23 26 0M31 56c0-23 26-23 26 0"
          fill="none"
          stroke="#15915f"
          strokeWidth="8"
          strokeLinecap="round"
        />
      </svg>
      <span>
        BudgetWorker<strong>Saathi</strong>
      </span>
    </div>
  );
}
function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    home: "m3 10 9-7 9 7v10H3Zm6 10v-7h6v7",
    jobs: "M8 6V3h8v3M3 7h18v14H3ZM3 12h18M10 11h4v3h-4",
    current: "M8 4h8v4H8ZM6 6H4v16h16V6h-2M8 13l3 3 5-6",
    help: "M12 16v.01M9 8a3 3 0 1 1 4 3c-1 1-1 2-1 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
    profile: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-3c0-8 16-8 16 0v3Z",
    shield: "M12 2 3 6v6c0 6 9 10 9 10s9-4 9-10V6ZM8 12l3 3 5-6",
    bell: "M5 17V9a7 7 0 0 1 14 0v8l2 2H3ZM9 22h6",
    search: "M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0m-2 5 7 7",
    speaker: "m3 9 5 0 6-5v16l-6-5H3ZM18 8c3 3 3 5 0 8",
    arrow: "m9 5 7 7-7 7",
    file: "M5 2h10l4 4v16H5ZM14 2v5h5M8 12h8M8 16h8",
    phone: "M5 3h4l2 5-3 2c2 4 3 5 6 6l2-3 5 2v4c0 6-20-5-18-14Z",
  };
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.file} />
    </svg>
  );
}
export default function WorkerApp() {
  const [language, setLanguage] = useState<"hi" | "en">("hi");
  const [stage, setStage] = useState<"language" | "login" | "otp">("language");
  const [user, setUser] = useState<{
    name: string | null;
    phone: string;
  } | null>(null);
  const [profile, setProfile] = useState<Profile>(initial);
  const [account, setAccount] = useState<Account | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsUnavailable, setJobsUnavailable] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [tab, setTab] = useState<Tab>("home");
  const [selected, setSelected] = useState<Job | null>(null);
  const [filter, setFilter] = useState("");
  const [hiddenJobs, setHiddenJobs] = useState<string[]>([]);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string>();
  const [testHint, setTestHint] = useState<{ phone: string; code: string }>();
  const hintCode = stage === "otp" ? devCode : testHint?.phone === phone ? testHint.code : undefined;
  const [cooldown, setCooldown] = useState(0);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [topic, setTopic] = useState("OTHER");
  const [message, setMessage] = useState("");
  const t = (hi: string, en: string) => (language === "hi" ? hi : en);
  const category = (key: string) => {
    const item = categories.find((c) => c[0] === key);
    return item ? item[language === "hi" ? 1 : 2] : key;
  };
  const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;
  const period = (value: string) =>
    value === "HOUR"
      ? t("घंटा", "hour")
      : value === "DAY"
        ? t("दिन", "day")
        : t("महीना", "month");
  async function loadJobs(city?: string) {
    // Job availability must not prevent access to a worker's saved profile.
    const [me, list] = await Promise.allSettled([
      api<{ applications: Application[] }>("/api/marketplace/me"),
      api<{ jobs: Job[] }>(
        `/api/marketplace/jobs${city ? `?city=${encodeURIComponent(city)}` : ""}`,
      ),
    ]);
    setApplications(me.status === "fulfilled" ? me.value.applications : []);
    setJobs(list.status === "fulfilled" ? list.value.jobs : []);
    setJobsUnavailable(me.status === "rejected" || list.status === "rejected");
  }
  async function loadAccount() {
    const a = await api<Account>("/api/worker-account");
    setAccount(a);
    setProfile(a.profile || initial);
    await loadJobs(a.profile?.city);
    return a;
  }
  function chooseLanguage(next: "hi" | "en") {
    setLanguage(next);
    try {
      localStorage.setItem("saathi-language", next);
    } catch {
      // Keep the selection usable when storage is unavailable.
    }
  }
  useEffect(() => {
    (async () => {
      // Restore local preferences before making the session request.
      await Promise.resolve();
      try {
        const lang = localStorage.getItem("saathi-language");
        if (lang === "hi" || lang === "en") {
          setLanguage(lang);
          setStage("login");
        }
      } catch {
        // Use the default language when storage is unavailable.
      }
      try {
        const s = await api<{ user: typeof user }>("/api/auth/me");
        if (s.user) {
          await loadAccount();
          setUser(s.user);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not connect");
      } finally {
        setReady(true);
      }
    })();
    return () => {
      window.speechSynthesis?.cancel();
    };
    // The session is loaded once when the worker app opens.
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  useEffect(() => {
    if (user || stage !== "login" || !/^[6-9]\d{9}$/.test(phone)) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/auth/test-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const result: { devCode: string | null } = await response.json();
        if (!controller.signal.aborted && result.devCode) {
          setTestHint({ phone, code: result.devCode });
        }
      } catch {
        // A hint lookup must not interrupt normal OTP login.
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [phone, stage, user]);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  function go(next: Tab) {
    setTab(next);
    setError("");
    setNotice("");
    window.speechSynthesis?.cancel();
    window.scrollTo({ top: 0 });
  }
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again");
    } finally {
      setBusy(false);
    }
  }
  async function sendOtp() {
    const result = await api<{ devCode?: string }>("/api/auth/request-otp", {
      phone,
    });
    setDevCode(result.devCode);
    setStage("otp");
    setCooldown(30);
  }
  async function login(e: React.FormEvent) {
    e.preventDefault();
    await action(async () => {
      if (stage !== "otp") return sendOtp();
      await api("/api/auth/verify-otp", { phone, code });
      const s = await api<{ user: NonNullable<typeof user> }>("/api/auth/me");
      const a = await loadAccount();
      setUser(s.user);
      go(a.profile ? "home" : "profile");
    });
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    await action(async () => {
      const {
        id,
        phone: verifiedPhone,
        onboardingStatus,
        ...editable
      } = profile;
      void id;
      void verifiedPhone;
      void onboardingStatus;
      const saved = await api<{ profile: Profile }>(
        "/api/worker-account",
        {
          ...editable,
          area: editable.area || "",
          about: editable.about || "",
          skill: editable.skill || "",
          whenCanJoin: editable.whenCanJoin || "",
          status: editable.status === "PLACED" ? "INACTIVE" : editable.status,
        },
        "PUT",
      );
      // The write response contains the committed database record. An unrelated
      // refresh failure must not turn a successful save into a reported failure.
      setProfile(saved.profile);
      setAccount((previous) => previous ? { ...previous, profile: saved.profile } : previous);
      setUser((previous) => previous ? { ...previous, name: saved.profile.name } : previous);
      setNotice(
        t(
          "प्रोफ़ाइल सेव हो गई। टीम आपकी जानकारी की समीक्षा करेगी।",
          "Profile saved. The team will review your information.",
        ),
      );
      await loadJobs(saved.profile.city);
    });
  }
  async function logout() {
    await action(async () => {
      await api("/api/auth/logout", {});
      setUser(null);
      setProfile(initial);
      setAccount(null);
      setApplications([]);
      setJobs([]);
      setJobsUnavailable(false);
      setCode("");
      setPhone("");
      setSelected(null);
      setHiddenJobs([]);
      setMessage("");
      setTopic("OTHER");
      setFilter("");
      setDevCode(undefined);
      setTestHint(undefined);
      setStage("login");
      setTab("home");
    });
  }
  function field(key: keyof Profile, numeric = false) {
    return (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) =>
      setProfile((p) => ({
        ...p,
        [key]: numeric
          ? e.target.value === ""
            ? null
            : Number(e.target.value)
          : e.target.value,
      }));
  }
  function listen(job: Job) {
    const bridge = (window as Window & { ReactNativeWebView?: { postMessage: (message: string) => void } }).ReactNativeWebView;
    if (bridge) {
      bridge.postMessage(JSON.stringify({ type: "saathi:speak", language, text: `${job.title}. ${job.area}, ${job.city}. ${money(job.payInr)} ${period(job.payPeriod)}. ${job.schedule}. ${job.description}` }));
      return;
    }
    if (!window.speechSynthesis) {
      setError(
        t(
          "इस डिवाइस में सुनने की सुविधा उपलब्ध नहीं है।",
          "Audio reading is unavailable on this device.",
        ),
      );
      return;
    }
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(
      `${job.title}. ${job.area}, ${job.city}. ${money(job.payInr)} ${period(job.payPeriod)}. ${job.schedule}. ${job.description}`,
    );
    speech.lang = language === "hi" ? "hi-IN" : "en-IN";
    window.speechSynthesis.speak(speech);
  }
  const apply = (job: Job) =>
    action(async () => {
      await api(`/api/marketplace/jobs/${job.id}/apply`, {
        message: "I am interested in this job / मुझे इस काम में रुचि है।",
      });
      await loadAccount();
      setNotice(
        t("आपकी रुचि भेज दी गई है।", "Your application has been sent."),
      );
    });
  const photo = account?.documents.find((d) => d.kind === "PHOTO");
  const current = applications.find(
    (a) => a.status === "HIRED" && a.job.status === "ACTIVE",
  );
  const application = selected
    ? applications.find((a) => a.job.id === selected.id)
    : undefined;
  const completeness = Math.round(
    ([
      profile.name,
      profile.city,
      profile.area,
      profile.skill,
      profile.experienceYears !== null,
      profile.age,
      account?.documents.some((d) => d.kind === "PHOTO"),
    ].filter(Boolean).length /
      7) *
      100,
  );
  const titles: Record<Tab, string> = {
    home: t("होम", "Home"),
    jobs: t("आपके लिए नौकरियाँ", "Jobs for you"),
    current: t("मेरा काम", "My work"),
    help: t("सहायता", "Help & support"),
    profile: t("अपनी जानकारी भरें", "Your work profile"),
    documents: t("दस्तावेज़ अपलोड करें", "Upload documents"),
    detail: t("काम की जानकारी", "Job details"),
    duty: t("ड्यूटी कार्ड", "Duty card"),
    interviews: t("इंटरव्यू आमंत्रण", "Interview invitations"),
  };
  const status = (value: string) =>
    ({
      PENDING: t("समीक्षा बाकी है", "Under review"),
      APPROVED: t("स्वीकृत", "Approved"),
      REJECTED: t("दोबारा जाँच आवश्यक", "Needs review"),
      APPLIED: t("आवेदन भेजा", "Applied"),
      OFFERED: t("काम का ऑफर", "Job offered"),
      HIRED: t("काम शुरू", "Hired"),
      COMPLETED: t("पूरा हुआ", "Completed"),
      WITHDRAWN: t("वापस लिया", "Withdrawn"),
      OPEN: t("खुला है", "Open"),
      RESOLVED: t("हल हो गया", "Resolved"),
      REQUESTED: t("अनुरोध भेजा", "Requested"),
      SCHEDULED: t("समय तय है", "Scheduled"),
      CANCELLED: t("रद्द", "Cancelled"),
      DECLINED: t("अस्वीकृत", "Declined"),
    })[value] || value.replaceAll("_", " ");
  function jobCard(job: Job) {
    const applied = applications.find((a) => a.job.id === job.id);
    return (
      <article className="card job-card" key={job.id}>
        <div className="card-heading">
          <span className="tile mint">
            <Icon name="profile" />
          </span>
          <div>
            <h3>{job.title}</h3>
            <p>
              {job.area}, {job.city}
            </p>
          </div>
          {applied && <span className="badge">{status(applied.status)}</span>}
        </div>
        <dl>
          <div>
            <dt>₹</dt>
            <dd>
              <strong>
                {money(job.payInr)} / {period(job.payPeriod)}
              </strong>
            </dd>
          </div>
          <div>
            <dt>◷</dt>
            <dd>{job.schedule}</dd>
          </div>
          <div>
            <dt>✓</dt>
            <dd>
              {category(job.category)} ·{" "}
              {job.employmentType === "LIVE_IN"
                ? "Live-in"
                : t("दैनिक काम", "Daily work")}
            </dd>
          </div>
        </dl>
        <p className="job-description">{job.description}</p>
        <div className="actions">
          <button className="secondary" onClick={() => listen(job)}>
            <Icon name="speaker" />
            {t("सुनें", "Listen")}
          </button>
          <button
            className="primary"
            onClick={() => {
              setSelected(job);
              go("detail");
            }}
          >
            {t("काम देखें", "View job")} →
          </button>
        </div>
        <button
          className="text-button"
          onClick={() => setHiddenJobs((old) => [...old, job.id])}
        >
          {t("अभी रुचि नहीं है", "Not interested for now")}
        </button>
      </article>
    );
  }
  const feedback = (
    <>
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="alert success" role="status">
          {notice}
        </div>
      )}
    </>
  );
  if (!ready)
    return (
      <main className="splash" role="status">
        <Logo large />
        <p>
          {t("आपके साथ", "By your side")}
          <br />
          {t("बेहतर काम के लिए", "For better work")}
        </p>
        <span className="loading-dots">•••</span>
        <small>Trusted Homes. Better Futures.</small>
      </main>
    );
  if (!user)
    return (
      <div className="onboarding">
        <section className="welcome-art">
          <Logo large />
          <h1>
            {t("काम मिले आसानी से.", "Find work easily.")}
            <br />
            {t("शर्तें पता हों पहले से.", "Know the duties before joining.")}
          </h1>
          <p>Better Work. Brighter Tomorrows.</p>
          <div className="trust-strip">
            <span>✓ {t("सुरक्षित", "Secure")}</span>
            <span>✓ {t("सरल", "Simple")}</span>
            <span>✓ {t("आपके साथ", "By your side")}</span>
          </div>
        </section>
        <main className="onboarding-panel">
          <Logo />
          {stage === "language" ? (
            <>
              <span className="step-label">01 / 04</span>
              <h1>{t("अपनी भाषा चुनें", "Choose your language")}</h1>
              <p className="muted">
                {t("जिस भाषा में आप आसानी से समझ सकें, उसे चुनें।", "Choose the language you’re comfortable with.")}
              </p>
              <div className="language-list">
                {[
                  ["hi", "हिंदी", "Hindi"],
                  ["en", "English", "अंग्रेज़ी"],
                ].map(([key, name, sub]) => (
                  <button
                    key={key}
                    className={
                      language === key ? "language selected" : "language"
                    }
                    onClick={() => chooseLanguage(key as "hi" | "en")}
                    aria-pressed={language === key}
                  >
                    <span className="tile">अ</span>
                    <span>
                      {name}
                      <small>{sub}</small>
                    </span>
                    <span className="check">
                      {language === key ? "✓" : "○"}
                    </span>
                  </button>
                ))}
              </div>
              <button
                className="primary wide"
                onClick={() => {
                  chooseLanguage(language);
                  setStage("login");
                }}
              >
                {t("आगे बढ़ें", "Continue")} →
              </button>
            </>
          ) : (
            <>
              <button
                className="back"
                onClick={() => {
                  setStage(stage === "otp" ? "login" : "language");
                  setCode("");
                  setDevCode(undefined);
                  setError("");
                }}
              >
                ← {t("वापस", "Back")}
              </button>
              <span className="step-label">02 / 04</span>
              <h1>
                {stage === "otp"
                  ? t("OTP डालें", "Enter your OTP")
                  : t("मोबाइल नंबर से लॉगिन", "Login with your mobile")}
              </h1>
              <p className="muted">
                {stage === "otp" && devCode
                  ? t("टेस्ट OTP नीचे दिखाया गया है। SMS नहीं आएगा।", "Your test OTP is shown below. No SMS will be sent.")
                  : stage === "otp"
                  ? t(
                      `+91 ${phone} के लिए वेरिफिकेशन कोड डालें।`,
                      `Enter the verification code for +91 ${phone}.`,
                    )
                  : t(
                      "हम आपके मोबाइल पर OTP भेजेंगे।",
                      "We’ll send a verification code to your phone.",
                    )}
              </p>
              <form onSubmit={login}>
                {stage === "otp" ? (
                  <label>
                    {t("वेरिफिकेशन कोड", "Verification code")}
                    <input
                      className="otp"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]{6,10}"
                      maxLength={10}
                      required
                      value={code}
                      onChange={(e) =>
                        setCode(e.target.value.replace(/\D/g, ""))
                      }
                    />
                  </label>
                ) : (
                  <label>
                    {t("मोबाइल नंबर", "Mobile number")}
                    <div className="phone-input">
                      <span>+91</span>
                      <input
                        type="tel"
                        autoComplete="tel-national"
                        inputMode="numeric"
                        pattern="[6-9][0-9]{9}"
                        maxLength={10}
                        required
                        placeholder="98765 43210"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value.replace(/\D/g, ""));
                          setTestHint(undefined);
                          setDevCode(undefined);
                        }}
                      />
                    </div>
                  </label>
                )}
                {hintCode && (
                  <p className="alert" role="status">
                    {t("टेस्ट OTP:", "Test OTP:")} <strong>{hintCode}</strong>
                  </p>
                )}
                {feedback}
                <button className="primary wide" disabled={busy}>
                  {busy
                    ? t("कृपया रुकें…", "Please wait…")
                    : stage === "otp"
                      ? t("आगे बढ़ें", "Verify & continue")
                      : t("OTP भेजें", "Send OTP")}
                </button>
                {stage === "otp" && (
                  <button
                    type="button"
                    className="text-button wide"
                    disabled={busy || cooldown > 0}
                    onClick={() => action(sendOtp)}
                  >
                    {cooldown ? `${cooldown}s · ` : ""}
                    {t("OTP दोबारा भेजें", "Resend OTP")}
                  </button>
                )}
              </form>
              <p className="fine-print">
                {t(
                  "मोबाइल सत्यापन आपके खाते को सुरक्षित रखता है। रजिस्ट्रेशन निःशुल्क है।",
                  "Phone verification keeps your account secure. Registration is free.",
                )}
              </p>
            </>
          )}
          <div className="onboarding-footer">
            <Icon name="shield" />
            {t("आपकी जानकारी, सुरक्षित", "Your information, kept safe")}
          </div>
        </main>
      </div>
    );
  return (
    <div className="app">
      <header className="topbar">
        <Logo />
        <div className="header-actions">
          <button
            className="language-toggle"
            onClick={() => {
              const next = language === "hi" ? "en" : "hi";
              chooseLanguage(next);
            }}
          >
            {language === "hi" ? "English" : "हिंदी"}
          </button>
          <button
            className="icon-button"
            aria-label={t("इंटरव्यू आमंत्रण", "Interview invitations")}
            onClick={() => go("interviews")}
          >
            <Icon name="bell" />
            {!!account?.invitations.length && <i />}
          </button>
        </div>
      </header>
      <div className="workspace">
        <nav className="main-nav" aria-label="Saathi navigation">
          {(["home", "jobs", "current", "help", "profile"] as Tab[]).map(
            (key) => (
              <button
                key={key}
                className={
                  tab === key ||
                  (key === "jobs" && ["detail", "duty"].includes(tab)) ||
                  (key === "profile" && tab === "documents")
                    ? "active"
                    : ""
                }
                aria-current={tab === key ? "page" : undefined}
                onClick={() => go(key)}
              >
                <Icon name={key} />
                <span>
                  {
                    (
                      {
                        home: t("होम", "Home"),
                        jobs: t("नौकरियाँ", "Jobs"),
                        current: t("मेरा काम", "My work"),
                        help: t("सहायता", "Help"),
                        profile: t("प्रोफ़ाइल", "Profile"),
                      } as Partial<Record<Tab, string>>
                    )[key]
                  }
                </span>
              </button>
            ),
          )}
          <div className="nav-note">
            <Logo />
            <p>
              {t("बेहतर काम, बेहतर भविष्य", "Better work. Brighter futures.")}
            </p>
          </div>
        </nav>
        <main className="content">
          {tab !== "home" && (
            <div className="page-heading">
              <button
                className="back"
                onClick={() => go(tab === "duty" ? "detail" : "home")}
                aria-label={t("वापस", "Back")}
              >
                ←
              </button>
              <div>
                <h1>{titles[tab]}</h1>
                <p>
                  {tab === "jobs"
                    ? t("आपके शहर में उपलब्ध काम", "Opportunities in your city")
                    : tab === "profile"
                      ? t(
                          "यह जानकारी आपको सही काम दिलाने में मदद करेगी।",
                          "Help us find the right work for you.",
                        )
                      : tab === "documents"
                        ? t(
                            "आपके दस्तावेज़ केवल अधिकृत टीम देख सकती है।",
                            "Your documents are private to you and the authorized team.",
                          )
                        : ""}
                </p>
              </div>
            </div>
          )}
          {feedback}
          {jobsUnavailable && (
            <div className="alert" role="status">
              <p>{t(
                "नौकरियों की जानकारी अभी लोड नहीं हो रही है। आप अपनी प्रोफ़ाइल देख और सेव कर सकते हैं।",
                "Jobs are temporarily unavailable. You can still view and save your profile.",
              )}</p>
              <button
                className="text-button"
                disabled={busy}
                onClick={() => action(() => loadJobs(profile.city))}
              >
                {t("नौकरियाँ दोबारा लोड करें", "Retry loading jobs")}
              </button>
            </div>
          )}
          {tab === "home" && (
            <>
              <section className="greeting">
                <span className="eyebrow">
                  {t("आपका अपना साथी", "YOUR PARTNER IN WORK")}
                </span>
                <h1>
                  {t("नमस्ते", "Hello")},{" "}
                  {
                    (profile.name || user.name || t("साथी", "Saathi")).split(
                      " ",
                    )[0]
                  }{" "}
                  <span>👋</span>
                </h1>
                <p>
                  {t("आज आप किस स्थिति में हैं?", "How can we help you today?")}
                </p>
              </section>
              <div className="home-actions">
                <button className="big-action green" onClick={() => go("jobs")}>
                  <Icon name="search" />
                  <span>
                    {t("मुझे काम चाहिए", "I’m looking for work")}
                    <small>
                      {t(
                        "अपने लिए सही अवसर देखें",
                        "Find your next opportunity",
                      )}
                    </small>
                  </span>
                  <Icon name="arrow" />
                </button>
                <button
                  className="big-action blue"
                  onClick={() => go("current")}
                >
                  <Icon name="current" />
                  <span>
                    {t("मैं अभी जॉब पर हूँ", "My current work")}
                    <small>
                      {t(
                        "काम और ड्यूटी की जानकारी",
                        "Your job and agreed duties",
                      )}
                    </small>
                  </span>
                  <Icon name="arrow" />
                </button>
              </div>
              <div className="dashboard-grid">
                <section className="card">
                  <button className="row-button" onClick={() => go("profile")}>
                    <span className="tile sand">
                      <Icon name="profile" />
                    </span>
                    <span>
                      <strong>{t("मेरी प्रोफ़ाइल", "My profile")}</strong>
                      <small>
                        {completeness}% {t("पूरी है", "complete")}
                      </small>
                    </span>
                    <Icon name="arrow" />
                  </button>
                  <progress value={completeness} max={100} />
                  <div className="verification-row">
                    <Icon name="shield" />
                    <span>{t("पहचान सत्यापन", "ID verification")}</span>
                    <span>
                      {account?.verification?.aadhaarVerified
                        ? "✓"
                        : t("बाकी", "Pending")}
                    </span>
                  </div>
                  <div className="verification-row">
                    <Icon name="shield" />
                    <span>{t("पुलिस सत्यापन", "Police verification")}</span>
                    <span>
                      {account?.verification?.policeVerified
                        ? "✓"
                        : t("बाकी", "Pending")}
                    </span>
                  </div>
                  <div className="verification-row">
                    <Icon name="profile" />
                    <span>{t("प्रोफ़ाइल स्थिति", "Profile status")}</span>
                    <span>
                      {profile.id
                        ? status(profile.onboardingStatus || "PENDING")
                        : t("अधूरी", "Not created")}
                    </span>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => go("documents")}
                  >
                    {t("दस्तावेज़ जमा करें", "Submit documents")} →
                  </button>
                </section>
                <section className="card opportunity">
                  <span className="tile mint">
                    <Icon name="jobs" />
                  </span>
                  <h2>{t("आपका अगला कदम", "Your next step")}</h2>
                  <p>
                    {t(
                      "अपनी जानकारी और उपलब्धता अपडेट रखें। परिवार के इंटरव्यू आमंत्रण यहाँ देखें।",
                      "Keep your profile and availability up to date. Find interview invitations from families here.",
                    )}
                  </p>
                  <button
                    className="secondary"
                    onClick={() => go("interviews")}
                  >
                    {t("इंटरव्यू देखें", "View interviews")}{" "}
                    <span className="badge">
                      {account?.invitations.length || 0}
                    </span>
                  </button>
                </section>
              </div>
              <div className="saathi-banner">
                <Logo />
                <div>
                  <strong>
                    {t(
                      "बेहतर काम, बेहतर भविष्य",
                      "Better work. Brighter futures.",
                    )}
                  </strong>
                  <p>
                    {t(
                      "BudgetWorker Saathi के साथ",
                      "With BudgetWorker Saathi",
                    )}
                  </p>
                </div>
                <Icon name="shield" />
              </div>
            </>
          )}
          {tab === "profile" && (
            <form onSubmit={save} className="card profile-form">
              <div className="profile-avatar">
                {photo ? (
                  <Image
                    src={`/api/worker-account/documents?id=${photo.id}&preview=1`}
                    width={80}
                    height={80}
                    unoptimized
                    alt={t("आपकी फोटो", "Your photo")}
                  />
                ) : (
                  <Icon name="profile" />
                )}
              </div>
              <p className="center muted">+91 {user.phone}</p>
              <div className="form-grid">
                <label>
                  {t("नाम", "Full name")}
                  <input
                    value={profile.name}
                    onChange={field("name")}
                    required
                    minLength={2}
                    maxLength={100}
                  />
                </label>
                <label>
                  {t("उम्र", "Age")}
                  <input
                    type="number"
                    min={18}
                    max={80}
                    value={profile.age ?? ""}
                    onChange={field("age", true)}
                  />
                </label>
                <label>
                  {t("शहर", "City")}
                  <input
                    required
                    minLength={2}
                    maxLength={100}
                    value={profile.city}
                    onChange={field("city")}
                  />
                </label>
                <label>
                  {t("इलाका", "Area / locality")}
                  <input
                    maxLength={100}
                    value={profile.area || ""}
                    onChange={field("area")}
                  />
                </label>
              </div>
              <fieldset>
                <legend>{t("काम का प्रकार", "Type of work")}</legend>
                <div className="chips">
                  {categories.map(([key]) => (
                    <button
                      type="button"
                      key={key}
                      className={
                        profile.category === key ? "chip active" : "chip"
                      }
                      aria-pressed={profile.category === key}
                      onClick={() =>
                        setProfile((p) => ({ ...p, category: key }))
                      }
                    >
                      {profile.category === key ? "✓ " : "+ "}
                      {category(key)}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="form-grid">
                <label>
                  {t("काम की व्यवस्था", "Work arrangement")}
                  <select
                    value={profile.employmentType}
                    onChange={field("employmentType")}
                  >
                    <option value="PART_TIME">
                      {t("पार्ट-टाइम", "Part-time")}
                    </option>
                    <option value="FULL_TIME">
                      {t("फुल-टाइम", "Full-time")}
                    </option>
                    <option value="LIVE_IN">24-hour Live-in</option>
                  </select>
                </label>
                <label>
                  {t("अनुभव (साल)", "Years of experience")}
                  <input
                    type="number"
                    min={0}
                    max={80}
                    value={profile.experienceYears ?? ""}
                    onChange={field("experienceYears", true)}
                  />
                </label>
                <label>
                  {t("अपेक्षित वेतन (₹)", "Expected pay (₹)")}
                  <input
                    type="number"
                    min={1}
                    max={1000000}
                    value={profile.expectedPayInr ?? ""}
                    onChange={field("expectedPayInr", true)}
                  />
                </label>
                <label>
                  {t("वेतन अवधि", "Pay period")}
                  <select
                    value={profile.payPeriod}
                    onChange={field("payPeriod")}
                  >
                    <option value="MONTH">{t("महीना", "Monthly")}</option>
                    <option value="DAY">{t("दिन", "Daily")}</option>
                    <option value="HOUR">{t("घंटा", "Hourly")}</option>
                  </select>
                </label>
                <label>
                  {t("रोज़ काम के घंटे", "Hours per day")}
                  <input
                    type="number"
                    min={0.5}
                    max={24}
                    step={0.5}
                    value={profile.hoursPerDay ?? ""}
                    onChange={field("hoursPerDay", true)}
                  />
                </label>
                <label>
                  {t("कब से शुरू कर सकते हैं?", "When can you start?")}
                  <input
                    maxLength={100}
                    value={profile.whenCanJoin || ""}
                    onChange={field("whenCanJoin")}
                  />
                </label>
              </div>
              <label>
                {t("आपके कौशल", "Your skills")}
                <textarea
                  maxLength={1000}
                  value={profile.skill || ""}
                  onChange={field("skill")}
                />
              </label>
              <label>
                {t("अपने बारे में", "About you")}
                <textarea
                  maxLength={2000}
                  value={profile.about || ""}
                  onChange={field("about")}
                />
              </label>
              {profile.status === "PLACED" ? (
                <p className="alert">
                  {t(
                    "आपका काम टीम द्वारा प्रबंधित किया जाता है। उपलब्धता बदलने के लिए सहायता लें।",
                    "Your placement is managed by the team. Contact support to change availability.",
                  )}
                </p>
              ) : (
                <label>
                  {t("मेरी उपलब्धता", "My availability")}
                  <select value={profile.status} onChange={field("status")}>
                    <option value="AVAILABLE">
                      {t("काम के लिए उपलब्ध", "Ready for work")}
                    </option>
                    <option value="INACTIVE">
                      {t("अभी काम नहीं चाहिए", "Taking a break")}
                    </option>
                  </select>
                </label>
              )}
              <p className="fine-print">
                {t(
                  "सेव करने पर आप काम के अवसरों के लिए टीम से संपर्क की सहमति देते हैं। रजिस्ट्रेशन से नौकरी की गारंटी नहीं है।",
                  "By saving, you agree the team may contact you about work opportunities. Registration does not guarantee a job.",
                )}
              </p>
              <button className="primary wide" disabled={busy}>
                {busy
                  ? t("सेव हो रहा है…", "Saving…")
                  : t("प्रोफ़ाइल सेव करें", "Save my profile")}
              </button>
              {profile.id && (
                <button
                  className="secondary wide"
                  type="button"
                  onClick={() => go("documents")}
                >
                  {t("आगे: दस्तावेज़ अपलोड करें", "Next: upload documents")} →
                </button>
              )}
            </form>
          )}
          {tab === "documents" && (
            <section className="card">
              <p className="muted">
                {t(
                  "JPG, PNG या PDF · अधिकतम 2 MB। जमा करना सत्यापन की गारंटी नहीं है। आधार की masked copy इस्तेमाल करें।",
                  "JPG, PNG or PDF · up to 2 MB. Submission does not mean verification. Use a masked Aadhaar copy.",
                )}
              </p>
              {!profile.id ? (
                <button className="primary" onClick={() => go("profile")}>
                  {t("पहले प्रोफ़ाइल बनाएं", "Create your profile first")}
                </button>
              ) : (
                [
                  ["AADHAAR", "आधार कार्ड", "Aadhaar card"],
                  ["PHOTO", "फोटो", "Photo"],
                  [
                    "POLICE",
                    "पुलिस सत्यापन (यदि उपलब्ध)",
                    "Police verification (if available)",
                  ],
                  [
                    "EXPERIENCE",
                    "अनुभव प्रमाण (वैकल्पिक)",
                    "Experience certificate (optional)",
                  ],
                ].map(([kind, hi, en]) => {
                  const doc = account?.documents.find((d) => d.kind === kind);
                  return (
                    <div className="document-row" key={kind}>
                      <span className="tile sand">
                        <Icon name={kind === "PHOTO" ? "profile" : "file"} />
                      </span>
                      <div>
                        <strong>{t(hi, en)}</strong>
                        <small>
                          {doc
                            ? status(doc.status)
                            : t("अभी जमा नहीं किया", "Not uploaded")}
                        </small>
                        <label className="upload-label">
                          {doc
                            ? t("बदलें", "Replace file")
                            : t("अपलोड करें", "Upload file")}
                          <input
                            aria-label={t(hi, en)}
                            type="file"
                            disabled={busy}
                            accept={
                              kind === "PHOTO"
                                ? "image/jpeg,image/png"
                                : "image/jpeg,image/png,application/pdf"
                            }
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = "";
                              if (!file) return;
                              action(async () => {
                                if (file.size > 2 * 1024 * 1024)
                                  throw new Error(
                                    t(
                                      "अधिकतम 2 MB की फ़ाइल चुनें।",
                                      "Choose a file up to 2 MB.",
                                    ),
                                  );
                                const res = await fetch(
                                  `/api/worker-account/documents?kind=${kind}`,
                                  {
                                    method: "PUT",
                                    headers: { "Content-Type": file.type },
                                    body: file,
                                  },
                                );
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.error);
                                await loadAccount();
                                setNotice(
                                  t(
                                    "दस्तावेज़ सुरक्षित जमा हो गया। टीम समीक्षा करेगी।",
                                    "Document submitted securely for team review.",
                                  ),
                                );
                              });
                            }}
                          />
                        </label>
                      </div>
                      {doc && (
                        <a
                          className="text-button"
                          href={`/api/worker-account/documents?id=${doc.id}`}
                          download
                        >
                          {t("डाउनलोड", "Download")}
                        </a>
                      )}
                    </div>
                  );
                })
              )}
              <button className="primary wide" onClick={() => go("home")}>
                {t("होम पर जाएं", "Go to home")}
              </button>
            </section>
          )}
          {tab === "jobs" && (
            <>
              <div className="chips filters">
                <button
                  className={!filter ? "chip active" : "chip"}
                  onClick={() => setFilter("")}
                >
                  {t("सभी", "All")}
                </button>
                {categories.map(([key]) => (
                  <button
                    className={filter === key ? "chip active" : "chip"}
                    key={key}
                    onClick={() => setFilter(key)}
                  >
                    {category(key)}
                  </button>
                ))}
              </div>
              <div className="section-heading">
                <span className="muted">
                  {profile.city || t("सभी शहर", "All cities")}
                </span>
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() =>
                    action(async () => {
                      await loadAccount();
                      setHiddenJobs([]);
                    })
                  }
                >
                  ↻ {t("रीफ़्रेश", "Refresh")}
                </button>
              </div>
              <div className="job-grid">
                {jobs
                  .filter(
                    (j) =>
                      (!filter || j.category === filter) &&
                      !hiddenJobs.includes(j.id),
                  )
                  .map(jobCard)}
              </div>
              {!jobsUnavailable && !jobs.some(
                (j) =>
                  (!filter || j.category === filter) &&
                  !hiddenJobs.includes(j.id),
              ) && (
                <div className="card empty">
                  <Icon name="search" />
                  <h2>
                    {t(
                      "अभी कोई काम उपलब्ध नहीं है",
                      "No jobs available right now",
                    )}
                  </h2>
                  <p>
                    {t(
                      "अपनी प्रोफ़ाइल अपडेट रखें और फिर देखें।",
                      "Keep your profile up to date and check back soon.",
                    )}
                  </p>
                </div>
              )}
              {applications.length > 0 && (
                <section className="applications">
                  <h2>{t("मेरे आवेदन", "My applications")}</h2>
                  {applications.map((a) => (
                    <button
                      key={a.id}
                      className="card row-button"
                      onClick={() => {
                        setSelected(a.job);
                        go("detail");
                      }}
                    >
                      <Icon name="jobs" />
                      <span>
                        <strong>{a.job.title}</strong>
                        <small>{status(a.status)}</small>
                      </span>
                      <Icon name="arrow" />
                    </button>
                  ))}
                </section>
              )}
            </>
          )}
          {(tab === "detail" || tab === "duty") && selected && (
            <section className="card detail">
              <div className="card-heading">
                <span className="tile rose">
                  <Icon name="profile" />
                </span>
                <div>
                  <h2>{selected.title}</h2>
                  <p>
                    {selected.area}, {selected.city}
                  </p>
                </div>
              </div>
              {tab === "duty" && (
                <div className="duty-title">
                  {t(
                    "आपका काम — स्पष्ट और लिखित",
                    "Your work — clear and in writing",
                  )}
                </div>
              )}
              <dl className="details">
                <div>
                  <dt>{t("वेतन", "Pay")}</dt>
                  <dd>
                    {money(selected.payInr)} / {period(selected.payPeriod)}
                  </dd>
                </div>
                <div>
                  <dt>{t("काम का समय", "Work schedule")}</dt>
                  <dd>{selected.schedule}</dd>
                </div>
                <div>
                  <dt>{t("काम का प्रकार", "Work type")}</dt>
                  <dd>{category(selected.category)}</dd>
                </div>
              </dl>
              <h3>{t("काम और शर्तें", "Duties and terms")}</h3>
              <p className="duties">{selected.description}</p>
              <div className="alert sand">
                {t(
                  "कृपया ध्यान दें: छुट्टी, शुरू होने की तारीख और अतिरिक्त काम पहले परिवार और टीम से स्पष्ट करें। केवल लिखे काम पर सहमति दें।",
                  "Confirm weekly off, joining date and any extra work with the family and team before agreeing. Only agree to the listed duties.",
                )}
              </div>
              <button
                className="secondary wide"
                onClick={() => listen(selected)}
              >
                <Icon name="speaker" />
                {t("काम की जानकारी सुनें", "Listen to job details")}
              </button>
              {tab === "detail" && (
                <button className="secondary wide" onClick={() => go("duty")}>
                  <Icon name="file" />
                  {t("ड्यूटी कार्ड देखें", "View duty card")}
                </button>
              )}
              {application?.status === "OFFERED" ? (
                <button
                  className="primary wide"
                  disabled={busy}
                  onClick={() =>
                    action(async () => {
                      await api(
                        `/api/marketplace/applications/${application.id}/status`,
                        { action: "accept" },
                      );
                      await loadAccount();
                      go("current");
                      setNotice(
                        t(
                          "आपने काम का ऑफर स्वीकार किया।",
                          "You accepted the job offer.",
                        ),
                      );
                    })
                  }
                >
                  {t(
                    "मुझे शर्तें मंज़ूर हैं — ऑफर स्वीकार करें",
                    "I agree to the duties — accept offer",
                  )}
                </button>
              ) : application ? (
                <p className="alert success">{status(application.status)}</p>
              ) : (
                <button
                  className="primary wide"
                  disabled={busy}
                  onClick={() => apply(selected)}
                >
                  {t("मुझे रुचि है", "Interested")}
                </button>
              )}
              {application &&
                ["APPLIED", "OFFERED"].includes(application.status) && (
                  <button
                    className="text-button wide"
                    disabled={busy}
                    onClick={() =>
                      action(async () => {
                        await api(
                          `/api/marketplace/applications/${application.id}/status`,
                          { action: "withdraw" },
                        );
                        await loadAccount();
                        setNotice(
                          t(
                            "आवेदन वापस ले लिया गया।",
                            "Application withdrawn.",
                          ),
                        );
                      })
                    }
                  >
                    {t("आवेदन वापस लें", "Withdraw application")}
                  </button>
                )}
            </section>
          )}
          {tab === "current" && (
            <>
              {current ? (
                <>
                  <div className="working-banner">
                    <Icon name="shield" />
                    <div>
                      <strong>
                        {t("अभी काम कर रहे हैं", "Currently working")}
                      </strong>
                      <small>
                        {t("आपका सक्रिय काम", "Your active placement")}
                      </small>
                    </div>
                  </div>
                  <section className="card">
                    <h2>{current.job.title}</h2>
                    <p className="muted">
                      {current.job.area}, {current.job.city}
                    </p>
                    <dl className="details">
                      <div>
                        <dt>{t("वेतन", "Pay")}</dt>
                        <dd>
                          {money(current.job.payInr)} /{" "}
                          {period(current.job.payPeriod)}
                        </dd>
                      </div>
                      <div>
                        <dt>{t("समय", "Schedule")}</dt>
                        <dd>{current.job.schedule}</dd>
                      </div>
                    </dl>
                    <button
                      className="secondary wide"
                      onClick={() => {
                        setSelected(current.job);
                        go("duty");
                      }}
                    >
                      {t("ड्यूटी कार्ड देखें", "View duty card")}
                    </button>
                    {current.contactPhone && (
                      <a
                        className="secondary wide"
                        href={`tel:${current.contactPhone}`}
                      >
                        <Icon name="phone" />
                        {t("परिवार से बात करें", "Call family")}
                      </a>
                    )}
                  </section>
                </>
              ) : (
                <div className="card empty">
                  <Icon name="current" />
                  <h2>
                    {profile.status === "PLACED"
                      ? t(
                          "आपका काम टीम संभाल रही है",
                          "Your placement is managed by the team",
                        )
                      : t(
                          "अभी कोई सक्रिय काम नहीं है",
                          "No active placement yet",
                        )}
                  </h2>
                  <p>
                    {t(
                      "स्वीकार किया हुआ काम यहाँ दिखेगा। जानकारी के लिए टीम से संपर्क करें।",
                      "An accepted job will appear here. Contact the team for placement details.",
                    )}
                  </p>
                </div>
              )}
              <section className="card menu-card">
                {topics
                  .filter((i) =>
                    ["LEAVE", "SALARY", "QUIT", "OTHER"].includes(i[0]),
                  )
                  .map(([key, hi, en]) => (
                    <button
                      className="row-button"
                      key={key}
                      onClick={() => {
                        setTopic(key);
                        go("help");
                      }}
                    >
                      <span className="tile sand">
                        <Icon name="help" />
                      </span>
                      <span>{t(hi, en)}</span>
                      <Icon name="arrow" />
                    </button>
                  ))}
              </section>
            </>
          )}
          {tab === "help" && (
            <>
              <div className="help-banner">
                <span className="tile">
                  <Icon name="phone" />
                </span>
                <div>
                  <h2>{t("किसी भी समस्या में", "Whenever you need help")}</h2>
                  <p>{t("हम आपके साथ हैं", "We’re here for you")}</p>
                </div>
              </div>
              <section className="card">
                <h2>
                  {t("टीम को अपनी बात बताएं", "Send a request to the team")}
                </h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    action(async () => {
                      const result = await api<{ request: { id: string } }>(
                        "/api/worker-account/support",
                        { topic, message },
                      );
                      setMessage("");
                      await loadAccount();
                      setNotice(
                        t(
                          `अनुरोध जमा हो गया। संदर्भ: ${result.request.id}`,
                          `Request submitted. Reference: ${result.request.id}`,
                        ),
                      );
                    });
                  }}
                >
                  <label>
                    {t("आपको किसमें मदद चाहिए?", "What do you need help with?")}
                    <select
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                    >
                      {topics.map(([key, hi, en]) => (
                        <option value={key} key={key}>
                          {t(hi, en)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t("अपनी समस्या लिखें", "Tell us what happened")}
                    <textarea
                      required
                      minLength={5}
                      maxLength={2000}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </label>
                  <button
                    className="primary wide"
                    disabled={busy || !profile.id}
                  >
                    {t("अनुरोध भेजें", "Send request")}
                  </button>
                  {!profile.id && (
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => go("profile")}
                    >
                      {t("पहले प्रोफ़ाइल बनाएं", "Create your profile first")}
                    </button>
                  )}
                </form>
              </section>
              <a className="sos" href="tel:112">
                <Icon name="shield" />
                <span>
                  {t("आपातकालीन मदद · 112", "Emergency assistance · 112")}
                  <small>
                    {t(
                      "तुरंत खतरे में राष्ट्रीय आपातकालीन सेवा को कॉल करें",
                      "Call India’s emergency service if you are in immediate danger",
                    )}
                  </small>
                </span>
              </a>
              <p className="fine-print">
                {t(
                  "टीम के अनुरोध आपातकालीन सेवा नहीं हैं।",
                  "Team requests are not an emergency service.",
                )}
              </p>
              {!!account?.supportRequests.length && (
                <section>
                  <h2>{t("मेरे अनुरोध", "My requests")}</h2>
                  {account.supportRequests.map((s) => (
                    <article className="card request" key={s.id}>
                      <span className="badge">{status(s.status)}</span>
                      <strong>
                        {
                          topics.find((i) => i[0] === s.topic)?.[
                            language === "hi" ? 1 : 2
                          ]
                        }
                      </strong>
                      <p>{s.message}</p>
                    </article>
                  ))}
                </section>
              )}
            </>
          )}
          {tab === "interviews" && (
            <>
              <button
                className="text-button"
                disabled={busy}
                onClick={() =>
                  action(async () => {
                    await loadAccount();
                  })
                }
              >
                ↻ {t("रीफ़्रेश", "Refresh")}
              </button>
              {account?.invitations.length ? (
                account.invitations.map((i) => (
                  <article className="card invitation" key={i.id}>
                    <span className="badge">{status(i.status)}</span>
                    <h2>{i.familyName}</h2>
                    <p>{i.meetingArea}</p>
                    <strong>
                      {i.scheduledAt
                        ? new Intl.DateTimeFormat(
                            language === "hi" ? "hi-IN" : "en-IN",
                            {
                              dateStyle: "medium",
                              timeStyle: "short",
                              timeZone: "Asia/Kolkata",
                            },
                          ).format(new Date(i.scheduledAt)) + " IST"
                        : t("समय तय किया जाएगा", "Time to be arranged")}
                    </strong>
                    <p>{i.duties}</p>
                    <p>{i.schedule}</p>
                    <p className="muted">
                      {t(
                        "टीम समय की पुष्टि करके सुरक्षित जुड़ने का लिंक भेजेगी।",
                        "The team will confirm the time and share a secure joining link.",
                      )}
                    </p>
                  </article>
                ))
              ) : (
                <div className="card empty">
                  <Icon name="bell" />
                  <h2>
                    {t(
                      "अभी कोई इंटरव्यू आमंत्रण नहीं है",
                      "No interview invitations yet",
                    )}
                  </h2>
                  <p>
                    {t(
                      "परिवार का आमंत्रण आने पर यहाँ दिखेगा।",
                      "Invitations from families will appear here.",
                    )}
                  </p>
                </div>
              )}
            </>
          )}
          {tab === "profile" && (
            <button
              className="text-button signout"
              disabled={busy}
              onClick={logout}
            >
              {t("लॉग आउट", "Sign out")}
            </button>
          )}
        </main>
      </div>
      <footer>
        BudgetWorker Saathi ·{" "}
        {t("आपके साथ, बेहतर काम के लिए", "Better Work. Brighter Tomorrows.")}
      </footer>
    </div>
  );
}
