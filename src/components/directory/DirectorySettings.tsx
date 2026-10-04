"use client";
import { useState, useEffect } from "react";
type Settings = {
  headline: string;
  description: string;
  announcement: string;
  defaultCity: string;
  jobPostingEnabled: boolean;
};
export function DirectorySettings() {
  const [settings, setSettings] = useState<Settings | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch("/api/marketplace/settings")
      .then((r) => r.json())
      .then((d) => setSettings(d.settings))
      .catch(() => setError("Unable to load website content"));
  }, []);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/marketplace/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, jobPostingEnabled: false }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setNotice("Website content saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="bw-workspace">
      <h2>Website content</h2>
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
      {settings && (
        <form onSubmit={save} className="bw-card bw-form">
          {(
            ["headline", "description", "announcement", "defaultCity"] as const
          ).map((k) => (
            <label key={k} className="bw-field">
              {
                {
                  headline: "Homepage headline",
                  description: "Introduction",
                  announcement: "Announcement",
                  defaultCity: "Default city",
                }[k]
              }
              <textarea
                value={settings[k]}
                rows={k === "description" ? 3 : 1}
                onChange={(e) =>
                  setSettings({ ...settings, [k]: e.target.value })
                }
              />
            </label>
          ))}
          <button className="bw-button" disabled={busy}>
            {busy ? "Saving…" : "Save website content"}
          </button>
        </form>
      )}
    </div>
  );
}
