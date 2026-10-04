"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
type Settings = {
  headline: string;
  description: string;
  announcement: string;
  defaultCity: string;
  jobPostingEnabled: boolean;
};
type Job = {
  id: string;
  title: string;
  city: string;
  status: string;
  visible: boolean;
  payInr: number;
  payPeriod: string;
};
type Worker = {
  id: string;
  name: string;
  city: string;
  category: string;
  onboardingStatus: string;
};
export function AdminMarketplace({
  settings,
  jobs,
  workers,
}: {
  settings: Settings;
  jobs: Job[];
  workers: Worker[];
}) {
  const router = useRouter(),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  async function save(p: string, body: unknown) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/marketplace/admin/" + p, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setMessage("Saved.");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="bw-workspace">
      <h1>Marketplace controls</h1>
      <p className="bw-muted">
        Review worker signups, moderate offers and update the public website.
      </p>
      {error && (
        <p className="bw-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="bw-notice" role="status">
          {message}
        </p>
      )}
      <section className="bw-card">
        <h2>Worker approvals</h2>
        {workers.length === 0 ? (
          <p>No pending profiles.</p>
        ) : (
          workers.map((w) => (
            <div className="bw-admin-row" key={w.id}>
              <div>
                <strong>{w.name}</strong>
                <p>
                  {w.city} · {w.category} · {w.onboardingStatus.toLowerCase()}
                </p>
              </div>
              <div className="bw-actions">
                <button
                  className="bw-button"
                  disabled={busy}
                  onClick={() =>
                    void save("workers/" + w.id, { approved: true })
                  }
                >
                  Approve
                </button>
                <button
                  className="bw-button secondary"
                  disabled={busy}
                  onClick={() =>
                    void save("workers/" + w.id, { approved: false })
                  }
                >
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </section>
      <form
        className="bw-card bw-form"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void save("settings", {
            headline: f.get("headline"),
            description: f.get("description"),
            announcement: f.get("announcement"),
            defaultCity: f.get("defaultCity"),
            jobPostingEnabled: f.get("jobPostingEnabled") === "on",
          });
        }}
      >
        <h2>Website content</h2>
        <label className="bw-field">
          <span>Homepage headline</span>
          <input
            name="headline"
            defaultValue={settings.headline}
            minLength={5}
            maxLength={100}
            required
          />
        </label>
        <label className="bw-field">
          <span>Homepage description</span>
          <textarea
            name="description"
            defaultValue={settings.description}
            minLength={10}
            maxLength={400}
            required
          />
        </label>
        <label className="bw-field">
          <span>Announcement (optional)</span>
          <input
            name="announcement"
            defaultValue={settings.announcement}
            maxLength={200}
          />
        </label>
        <label className="bw-field">
          <span>Default city</span>
          <input
            name="defaultCity"
            defaultValue={settings.defaultCity}
            minLength={2}
            maxLength={80}
            required
          />
        </label>
        <label>
          <input
            type="checkbox"
            name="jobPostingEnabled"
            defaultChecked={settings.jobPostingEnabled}
          />{" "}
          Allow new job posts
        </label>
        <button className="bw-button" disabled={busy}>
          Save website settings
        </button>
      </form>
      <section className="bw-card">
        <h2>Recent jobs</h2>
        {jobs.length === 0 ? (
          <p>No jobs yet.</p>
        ) : (
          jobs.map((j) => (
            <div className="bw-admin-row" key={j.id}>
              <div>
                <strong>{j.title}</strong>
                <p>
                  {j.city} · ₹{j.payInr}/{j.payPeriod.toLowerCase()} ·{" "}
                  {j.status.toLowerCase()}
                </p>
                <p className="bw-muted">
                  {j.visible ? "Visible to workers" : "Hidden by moderation"}
                </p>
              </div>
              <button
                className="bw-button secondary"
                disabled={busy}
                onClick={() =>
                  void save("jobs/" + j.id, { visible: !j.visible })
                }
              >
                {j.visible ? "Hide offer" : "Restore offer"}
              </button>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
