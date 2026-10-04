"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  CATEGORIES,
  LABELS,
  PAY_PERIODS,
  payLabel,
  type JobDto,
  type MeDto,
  type ApplicationDto,
  type WorkerDto,
} from "../../../shared/marketplace";

async function api<T>(p: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch("/api/marketplace/" + p, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Could not complete this action");
  return data;
}
const statusLabel = (s: string) =>
  ({
    OPEN: "Open for applications",
    OFFERED: "Waiting for acceptance",
    ACTIVE: "Hire in progress",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    APPLIED: "Applied",
    HIRED: "Hired",
    WITHDRAWN: "Withdrawn",
    REJECTED: "Declined",
  })[s] ?? s;
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="bw-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Categories({
  value,
  onChange,
}: {
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {CATEGORIES.map((c) => (
        <option key={c} value={c}>
          {LABELS[c]}
        </option>
      ))}
    </select>
  );
}
function JobCard({
  job,
  children,
}: {
  job: JobDto;
  children?: React.ReactNode;
}) {
  return (
    <article className="bw-card">
      <div className="bw-card-head">
        <span className="bw-tag">{LABELS[job.category]}</span>
        <span className="bw-muted">
          {job.distanceKm != null ? job.distanceKm + " km away" : job.city}
        </span>
      </div>
      <h3>{job.title}</h3>
      <p className="bw-pay">{payLabel(job)}</p>
      <p className="bw-muted">
        {job.area} ·{" "}
        {job.employmentType === "PART_TIME" ? "Part-time" : "Full-time"}
      </p>
      <p>{job.schedule}</p>
      <p className="bw-description">{job.description}</p>
      <div className="bw-card-bottom">
        <span className="bw-status">{statusLabel(job.status)}</span>
        {children}
      </div>
    </article>
  );
}
function LocationFields({
  lat,
  lng,
  setLat,
  setLng,
}: {
  lat: string;
  lng: string;
  setLat: (s: string) => void;
  setLng: (s: string) => void;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  function locate() {
    if (!navigator.geolocation) {
      setMessage("Location unavailable. Enter coordinates below.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLat(String(p.coords.latitude));
        setLng(String(p.coords.longitude));
        setMessage(
          "Location added. Only your neighbourhood is shown publicly.",
        );
        setBusy(false);
      },
      () => {
        setMessage(
          "Location permission unavailable. Enter coordinates below or enable location.",
        );
        setBusy(false);
      },
      { timeout: 15000, maximumAge: 60000 },
    );
  }
  return (
    <div className="bw-location">
      <button
        type="button"
        className="bw-button secondary"
        disabled={busy}
        onClick={locate}
      >
        {busy ? "Finding location…" : "Use my current location"}
      </button>
      <p className="bw-muted">
        Use the location where the work will happen. {message}
      </p>
      <div className="bw-form-grid">
        <Field label="Latitude">
          <input
            aria-label="Latitude"
            type="number"
            min="-90"
            max="90"
            step="any"
            required
            value={lat}
            onChange={(e) => setLat(e.target.value)}
          />
        </Field>
        <Field label="Longitude">
          <input
            aria-label="Longitude"
            type="number"
            min="-180"
            max="180"
            step="any"
            required
            value={lng}
            onChange={(e) => setLng(e.target.value)}
          />
        </Field>
      </div>
    </div>
  );
}

function JobForm({ done, city }: { done: () => void; city: string }) {
  const [category, setCategory] = useState<string>("COOK"),
    [lat, setLat] = useState(""),
    [lng, setLng] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setBusy(true);
    setError("");
    try {
      await api("jobs", "POST", {
        title: f.get("title"),
        category,
        employmentType: f.get("employmentType"),
        description: f.get("description"),
        city: f.get("city"),
        area: f.get("area"),
        latitude: Number(lat),
        longitude: Number(lng),
        payInr: Number(f.get("payInr")),
        payPeriod: f.get("payPeriod"),
        schedule: f.get("schedule"),
      });
      done();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="bw-card bw-form" onSubmit={submit}>
      <h2>Tell workers what you need</h2>
      <p className="bw-muted">
        Your offer is free to post. Agree the work and pay directly with your
        chosen worker.
      </p>
      <Field label="Job title">
        <input
          name="title"
          placeholder="A morning cook for our family"
          minLength={5}
          maxLength={100}
          required
        />
      </Field>
      <div className="bw-form-grid">
        <Field label="Service">
          <Categories value={category} onChange={setCategory} />
        </Field>
        <Field label="Working arrangement">
          <select name="employmentType">
            <option value="PART_TIME">Part-time</option>
            <option value="FULL_TIME">Full-time</option>
          </select>
        </Field>
        <Field label="City">
          <input name="city" defaultValue={city} required maxLength={80} />
        </Field>
        <Field label="Neighbourhood">
          <input
            name="area"
            placeholder="e.g. Baner"
            required
            minLength={2}
            maxLength={120}
          />
        </Field>
        <Field label="Offered pay (₹)">
          <input name="payInr" type="number" min={1} max={1000000} required />
        </Field>
        <Field label="Pay frequency">
          <select name="payPeriod" defaultValue="MONTH">
            {PAY_PERIODS.map((p) => (
              <option key={p} value={p}>
                {p.toLowerCase()}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Days and hours">
        <input
          name="schedule"
          placeholder="Monday–Saturday, 8–10 am"
          minLength={3}
          maxLength={200}
          required
        />
      </Field>
      <Field label="What will the work involve?">
        <textarea
          name="description"
          placeholder="Describe the tasks, household size, and skills you need. Keep phone numbers and your full address private."
          minLength={20}
          maxLength={2000}
          rows={4}
          required
        />
      </Field>
      <LocationFields {...{ lat, lng, setLat, setLng }} />
      {error && (
        <p className="bw-error" role="alert">
          {error}
        </p>
      )}
      <button className="bw-button" disabled={busy}>
        {busy ? "Posting…" : "Post job"}
      </button>
    </form>
  );
}

function ProfileForm({
  worker,
  city,
  done,
}: {
  worker: WorkerDto | null;
  city: string;
  done: () => void;
}) {
  const [category, setCategory] = useState(worker?.category ?? "COOK"),
    [lat, setLat] = useState(worker?.latitude?.toString() ?? ""),
    [lng, setLng] = useState(worker?.longitude?.toString() ?? ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await api("worker", "PUT", {
        name: f.get("name"),
        category,
        employmentType: f.get("employmentType"),
        city: f.get("city"),
        area: f.get("area"),
        skill: f.get("skill"),
        about: f.get("about"),
        salaryExpectation: f.get("salaryExpectation"),
        experienceYears: Number(f.get("experienceYears")),
        latitude: Number(lat),
        longitude: Number(lng),
        serviceRadiusKm: Number(f.get("serviceRadiusKm")),
      });
      done();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="bw-card bw-form" onSubmit={submit}>
      <h2>{worker ? "Your work profile" : "Let’s set up your work profile"}</h2>
      <p className="bw-muted">
        New profiles are reviewed by our team before you can apply. Verification
        badges are managed by the team.
      </p>
      <Field label="Your name">
        <input
          name="name"
          defaultValue={worker?.name}
          minLength={2}
          maxLength={100}
          required
        />
      </Field>
      <div className="bw-form-grid">
        <Field label="Main service">
          <Categories value={category} onChange={setCategory} />
        </Field>
        <Field label="Working arrangement">
          <select
            name="employmentType"
            defaultValue={worker?.employmentType ?? "PART_TIME"}
          >
            <option value="PART_TIME">Part-time</option>
            <option value="FULL_TIME">Full-time</option>
          </select>
        </Field>
        <Field label="City">
          <input name="city" defaultValue={worker?.city ?? city} required />
        </Field>
        <Field label="Neighbourhood">
          <input
            name="area"
            defaultValue={worker?.area ?? ""}
            required
            minLength={2}
          />
        </Field>
        <Field label="Years of experience">
          <input
            type="number"
            name="experienceYears"
            defaultValue={worker?.experienceYears ?? 0}
            min={0}
            max={70}
            required
          />
        </Field>
        <Field label="Expected pay">
          <input
            name="salaryExpectation"
            defaultValue={worker?.salaryExpectation ?? ""}
            placeholder="₹15,000 per month"
            required
          />
        </Field>
      </div>
      <Field label="Skills">
        <input
          name="skill"
          defaultValue={worker?.skill ?? ""}
          placeholder="Vegetarian cooking, laundry…"
          minLength={2}
          maxLength={300}
          required
        />
      </Field>
      <Field label="About you">
        <textarea
          name="about"
          defaultValue={worker?.about ?? ""}
          maxLength={1000}
          rows={3}
        />
      </Field>
      <Field label="Travel radius (km)">
        <input
          name="serviceRadiusKm"
          type="number"
          defaultValue={worker?.serviceRadiusKm ?? 10}
          min={1}
          max={50}
          required
        />
      </Field>
      <LocationFields {...{ lat, lng, setLat, setLng }} />
      {error && (
        <p role="alert" className="bw-error">
          {error}
        </p>
      )}
      <button className="bw-button" disabled={busy}>
        {busy ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}

export function Marketplace({ mode }: { mode: "consumer" | "worker" }) {
  const [me, setMe] = useState<MeDto | null>(null),
    [loading, setLoading] = useState(true),
    [jobs, setJobs] = useState<JobDto[]>([]),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [tab, setTab] = useState("overview"),
    [city, setCity] = useState("Pune"),
    [category, setCategory] = useState(""),
    [cursor, setCursor] = useState<string | null>(null),
    [browseStarted, setBrowseStarted] = useState(false),
    [selected, setSelected] = useState<{
      job: JobDto;
      applications: ApplicationDto[];
    } | null>(null);
  const refresh = useCallback(async () => {
    try {
      const data = await api<MeDto>("me");
      setMe(data);
    } catch (e) {
      if ((e as Error).message === "Login required") setMe(null);
      else
        setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    void Promise.allSettled([
      api<MeDto>("me"),
      api<{ settings: { defaultCity: string } }>("settings"),
    ]).then(([account, settings]) => {
      if (!active) return;
      if (account.status === "fulfilled") setMe(account.value);
      else if (account.reason.message !== "Login required")
        setError(account.reason.message);
      setCity(
        (account.status === "fulfilled" && account.value.worker?.city) ||
          (settings.status === "fulfilled" && settings.value.settings.defaultCity) ||
          "Pune",
      );
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);
  async function browse(next?: string) {
    setBusy(true);
    setError("");
    try {
      const q = new URLSearchParams({ city });
      if (category) q.set("category", category);
      const w = me?.worker;
      if (w?.latitude != null && w.longitude != null) {
        q.set("lat", String(w.latitude));
        q.set("lng", String(w.longitude));
        q.set("radius", String(w.serviceRadiusKm));
      }
      if (next) q.set("cursor", next);
      const data = await api<{ jobs: JobDto[]; nextCursor: string | null }>(
        "jobs?" + q,
      );
      setJobs((old) => (next ? [...old, ...data.jobs] : data.jobs));
      setCursor(data.nextCursor);
      setBrowseStarted(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function action(p: string, body: unknown, message: string) {
    setBusy(true);
    setError("");
    try {
      await api(p, "POST", body);
      setNotice(message);
      await refresh();
      if (selected) {
        const d = await api<{ job: JobDto; applications: ApplicationDto[] }>(
          "jobs/" + selected.job.id,
        );
        setSelected(d);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function openJob(id: string) {
    setError("");
    setBusy(true);
    try {
      setSelected(await api("jobs/" + id));
      setTab("manage");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (loading && !me)
    return (
      <div className="bw-empty" role="status">
        Loading your workspace…
      </div>
    );
  if (!me)
    return (
      <section className="bw-welcome">
        <span className="bw-eyebrow">
          {mode === "worker" ? "Find work near you" : "Your home, your choice"}
        </span>
        <h1>
          {mode === "worker"
            ? "Good work starts close to home."
            : "Find the right help for your home."}
        </h1>
        <p>
          {mode === "worker"
            ? "See local offers, choose work that fits and build your reputation."
            : "Post your requirements, compare applications and agree the hire directly."}
        </p>
        {error && <p className="bw-error">{error}</p>}
        <Link
          href={"/login?next=" + (mode === "worker" ? "/work" : "/app")}
          className="bw-button"
        >
          Continue with phone
        </Link>
      </section>
    );
  const w = me.worker;
  return (
    <div className="bw-workspace">
      <div className="bw-mode-links">
        <Link href="/app" className={mode === "consumer" ? "active" : ""}>
          I need help
        </Link>
        <Link href="/work" className={mode === "worker" ? "active" : ""}>
          I’m looking for work
        </Link>
      </div>
      <div className="bw-page-head">
        <div>
          <p className="bw-eyebrow">
            {mode === "worker" ? "Worker workspace" : "Family workspace"}
          </p>
          <h1>Hello, {me.user.name ?? w?.name ?? "there"}.</h1>
          <p>
            {mode === "worker"
              ? "Find offers that fit your skills and your day."
              : "A little help, a more manageable day."}
          </p>
        </div>
        {mode === "consumer" && (
          <button
            className="bw-button"
            onClick={() => {
              setTab("new");
              setSelected(null);
            }}
          >
            + Post a job
          </button>
        )}
      </div>
      <nav className="bw-tabs" aria-label="Workspace sections">
        {(mode === "consumer"
          ? [["overview", "My jobs"]]
          : [
              ["overview", "Overview"],
              ["offers", "Nearby offers"],
              ["applications", "Applications"],
              ["profile", "My profile"],
            ]
        ).map(([key, label]) => (
          <button
            key={key}
            aria-current={tab === key ? "page" : undefined}
            className={tab === key ? "active" : ""}
            onClick={() => {
              setTab(key);
              setError("");
              setNotice("");
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      {error && (
        <p className="bw-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="bw-notice" role="status">
          {notice}
        </p>
      )}
      {mode === "consumer" && tab === "new" && (
        <JobForm
          city={city}
          done={() => {
            setTab("overview");
            setNotice("Your job is live. Nearby workers can apply.");
            void refresh();
          }}
        />
      )}
      {mode === "consumer" && tab === "overview" && (
        <>
          <div className="bw-stats">
            <div>
              <strong>
                {me.jobs.filter((j) => j.status === "OPEN").length}
              </strong>
              <span>Open jobs</span>
            </div>
            <div>
              <strong>
                {me.jobs.reduce((s, j) => s + j.applicationCount, 0)}
              </strong>
              <span>Applications</span>
            </div>
            <div>
              <strong>
                {me.jobs.filter((j) => j.status === "ACTIVE").length}
              </strong>
              <span>Active hires</span>
            </div>
          </div>
          {me.jobs.length ? (
            <div className="bw-grid">
              {me.jobs.map((job) => (
                <JobCard key={job.id} job={job}>
                  <button
                    className="bw-button secondary"
                    onClick={() => void openJob(job.id)}
                  >
                    View {job.applicationCount} applications
                  </button>
                </JobCard>
              ))}
            </div>
          ) : (
            <div className="bw-empty">
              <h2>Your first hire starts here</h2>
              <p>Post the service, hours and pay you have in mind.</p>
              <button className="bw-button" onClick={() => setTab("new")}>
                Post your first job
              </button>
              <Link href="/workers">Or browse the worker directory</Link>
            </div>
          )}
        </>
      )}
      {mode === "consumer" && tab === "manage" && selected && (
        <>
          <button className="bw-text-button" onClick={() => setTab("overview")}>
            ← My jobs
          </button>
          <JobCard job={selected.job}>
            {selected.job.status === "ACTIVE" && (
              <button
                disabled={busy}
                className="bw-button"
                onClick={() =>
                  void action(
                    "jobs/" + selected.job.id + "/status",
                    { action: "complete" },
                    "Hire marked complete. You can now leave a rating.",
                  )
                }
              >
                Mark completed
              </button>
            )}
            {!["CANCELLED", "COMPLETED"].includes(selected.job.status) && (
              <button
                disabled={busy}
                className="bw-text-button"
                onClick={() => {
                  if (confirm("Close this job and cancel its applications?"))
                    void action(
                      "jobs/" + selected.job.id + "/status",
                      { action: "cancel" },
                      "Job cancelled.",
                    );
                }}
              >
                Cancel job
              </button>
            )}
          </JobCard>
          {selected.job.status === "COMPLETED" && !selected.job.hasReviewed && (
            <form
              className="bw-card bw-form"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void action(
                  "jobs/" + selected.job.id + "/review",
                  {
                    stars: Number(f.get("stars")),
                    comment: String(f.get("comment")),
                  },
                  "Thanks. Your rating is now on the worker’s profile.",
                );
              }}
            >
              <h2>How did the hire go?</h2>
              <Field label="Rating">
                <select name="stars">
                  {[5, 4, 3, 2, 1].map((s) => (
                    <option key={s} value={s}>
                      {s} stars
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Your review">
                <textarea
                  name="comment"
                  maxLength={1000}
                  placeholder="Share your experience"
                />
              </Field>
              <button className="bw-button" disabled={busy}>
                Submit rating
              </button>
            </form>
          )}
          <h2>Applications</h2>
          {selected.applications.length === 0 ? (
            <div className="bw-empty">
              No applications yet. Workers will see your offer in their nearby
              feed.
            </div>
          ) : (
            selected.applications.map((a) => (
              <article className="bw-card" key={a.id}>
                <div className="bw-card-head">
                  <h3>{a.worker.name}</h3>
                  <span className="bw-status">{statusLabel(a.status)}</span>
                </div>
                <p className="bw-muted">
                  {a.worker.area}, {a.worker.city} ·{" "}
                  {a.worker.experienceYears ?? 0} years’ experience
                </p>
                <p>{a.worker.skill}</p>
                <p>
                  {a.worker.rating
                    ? "★ " +
                      a.worker.rating +
                      " · " +
                      a.worker.reviewCount +
                      " reviews"
                    : "No ratings yet"}
                  {a.worker.policeVerified ? " · Police verified" : ""}
                  {a.worker.aadhaarVerified ? " · Aadhaar verified" : ""}
                </p>
                <p className="bw-description">{a.message}</p>
                {a.contactPhone && (
                  <a
                    className="bw-button secondary"
                    href={"tel:" + a.contactPhone}
                  >
                    Call worker
                  </a>
                )}
                <div className="bw-actions">
                  {a.status === "APPLIED" && selected.job.status === "OPEN" && (
                    <button
                      disabled={busy}
                      className="bw-button"
                      onClick={() =>
                        void action(
                          "applications/" + a.id + "/status",
                          { action: "offer" },
                          "Offer sent. Contact details are shared after the worker accepts.",
                        )
                      }
                    >
                      Offer this job
                    </button>
                  )}
                  {["APPLIED", "OFFERED"].includes(a.status) && (
                    <button
                      disabled={busy}
                      className="bw-button secondary"
                      onClick={() =>
                        void action(
                          "applications/" + a.id + "/status",
                          { action: "reject" },
                          "Application declined.",
                        )
                      }
                    >
                      Decline
                    </button>
                  )}
                </div>
              </article>
            ))
          )}
        </>
      )}
      {mode === "worker" && tab === "overview" && (
        <>
          <div className="bw-stats">
            <div>
              <strong>{w?.rating ?? "—"}</strong>
              <span>{w?.reviewCount ?? 0} completed-hire ratings</span>
            </div>
            <div>
              <strong>
                {me.applications.filter((a) => a.status === "OFFERED").length}
              </strong>
              <span>Offers to accept</span>
            </div>
            <div>
              <strong>
                {me.applications.filter((a) => a.status === "HIRED").length}
              </strong>
              <span>Current hires</span>
            </div>
          </div>
          {!w ? (
            <div className="bw-empty">
              <h2>A profile helps families find you</h2>
              <p>
                Add your skills, expected pay and the area you can travel to.
              </p>
              <button className="bw-button" onClick={() => setTab("profile")}>
                Create my profile
              </button>
            </div>
          ) : (
            <div className="bw-card">
              <h2>{w.name}</h2>
              <p>
                {LABELS[w.category]} · {w.area}, {w.city} · {w.serviceRadiusKm}{" "}
                km travel radius
              </p>
              <p className="bw-notice">
                {w.onboardingStatus === "PENDING"
                  ? "Your profile is waiting for admin review."
                  : w.onboardingStatus === "REJECTED"
                    ? "Your profile needs team review. Contact support before applying."
                    : w.status !== "AVAILABLE"
                      ? "Your profile is currently unavailable. Ask the team to update it."
                      : "Your profile is approved. You can apply to local offers."}
              </p>
              <button className="bw-button" onClick={() => setTab("offers")}>
                Explore offers
              </button>
            </div>
          )}
          <h2>Your reviews</h2>
          {me.reviews.length ? (
            me.reviews.map((r) => (
              <article className="bw-card" key={r.id}>
                <strong>{"★".repeat(r.stars)}</strong>
                <p>{r.comment || "Rating from a completed hire"}</p>
              </article>
            ))
          ) : (
            <p className="bw-muted">
              Ratings appear here after families complete a hire and leave a
              review.
            </p>
          )}
        </>
      )}
      {mode === "worker" && tab === "profile" && (
        <ProfileForm
          worker={w}
          city={city}
          done={() => {
            setTab("overview");
            setNotice("Profile saved.");
            void refresh();
          }}
        />
      )}
      {mode === "worker" && tab === "offers" && (
        <>
          <form
            className="bw-filter"
            onSubmit={(e) => {
              e.preventDefault();
              void browse();
            }}
          >
            <Field label="City">
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </Field>
            <Field label="Service">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">All services</option>
                {CATEGORIES.map((c) => (
                  <option value={c} key={c}>
                    {LABELS[c]}
                  </option>
                ))}
              </select>
            </Field>
            <button className="bw-button" disabled={busy}>
              {busy ? "Searching…" : "Find offers"}
            </button>
          </form>
          <p className="bw-muted">
            {w?.latitude != null
              ? "Within " +
                w.serviceRadiusKm +
                " km of your saved profile location."
              : "Create a profile with your location to filter by distance."}
          </p>
          {browseStarted && jobs.length === 0 && (
            <div className="bw-empty">
              No matching offers in this area. Try another service or change
              your travel radius.
            </div>
          )}
          <div className="bw-grid">
            {jobs.map((job) => {
              const application = me.applications.find(
                (a) => a.job.id === job.id,
              );
              return (
                <JobCard key={job.id} job={job}>
                  {application ? (
                    <span>{statusLabel(application.status)}</span>
                  ) : (
                    <form
                      className="bw-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        void action(
                          "jobs/" + job.id + "/apply",
                          { message: String(f.get("message")) },
                          "Application sent. Check Applications for updates.",
                        );
                      }}
                    >
                      <Field label="Introduce yourself">
                        <input
                          name="message"
                          placeholder="Why are you a good fit?"
                          minLength={5}
                          maxLength={500}
                          required
                        />
                      </Field>
                      <button
                        className="bw-button"
                        disabled={
                          busy ||
                          !w ||
                          w.onboardingStatus !== "APPROVED" ||
                          w.status !== "AVAILABLE"
                        }
                      >
                        Apply to this job
                      </button>
                    </form>
                  )}
                </JobCard>
              );
            })}
          </div>
          {cursor && (
            <button
              className="bw-button secondary"
              disabled={busy}
              onClick={() => void browse(cursor)}
            >
              Load more offers
            </button>
          )}
        </>
      )}
      {mode === "worker" && tab === "applications" && (
        <>
          {me.applications.length === 0 ? (
            <div className="bw-empty">
              <h2>No applications yet</h2>
              <p>Find a nearby offer and introduce yourself.</p>
              <button className="bw-button" onClick={() => setTab("offers")}>
                See nearby offers
              </button>
            </div>
          ) : (
            <div className="bw-grid">
              {me.applications.map((a) => (
                <JobCard key={a.id} job={a.job}>
                  <span className="bw-status">{statusLabel(a.status)}</span>
                  {a.contactPhone && (
                    <a
                      href={"tel:" + a.contactPhone}
                      className="bw-button secondary"
                    >
                      Call family
                    </a>
                  )}
                  {a.status === "OFFERED" && (
                    <button
                      className="bw-button"
                      disabled={busy}
                      onClick={() =>
                        void action(
                          "applications/" + a.id + "/status",
                          { action: "accept" },
                          "Job accepted. You can now contact the family.",
                        )
                      }
                    >
                      Accept offer
                    </button>
                  )}
                  {["APPLIED", "OFFERED"].includes(a.status) && (
                    <button
                      className="bw-button secondary"
                      disabled={busy}
                      onClick={() =>
                        void action(
                          "applications/" + a.id + "/status",
                          { action: "withdraw" },
                          "Application withdrawn.",
                        )
                      }
                    >
                      Withdraw
                    </button>
                  )}
                </JobCard>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
