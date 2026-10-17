"use client";
import { useCallback, useEffect, useState } from "react";
import { CATEGORIES, LABELS } from "../../../shared/marketplace";
const adminCategories = CATEGORIES.filter((category) => category !== "CHEF");
type Worker = {
  id: string;
  name: string;
  phone: string;
  category: string;
  employmentType: string;
  city: string;
  area: string | null;
  status: string;
  resumeFileName: string | null;
  [key: string]: unknown;
};
const fields = [
  ["name", "Worker name"],
  ["phone", "Phone (private)"],
  ["city", "City"],
  ["area", "Area / neighbourhood"],
  ["age", "Age"],
  ["experienceYears", "Years of experience"],
  ["skill", "Skills"],
  ["whenCanJoin", "Can join from"],
  ["workingLocation", "Preferred work area"],
  ["religion", "Religion (optional)"],
] as const;
const empty = {
  name: "",
  phone: "",
  category: "HOUSEKEEPING",
  employmentType: "PART_TIME",
  city: "Pune",
  area: "",
  age: "",
  experienceYears: "",
  skill: "",
  about: "",
  whenCanJoin: "",
  workingLocation: "",
  vegNonVeg: "",
  religion: "",
  latitude: "",
  longitude: "",
  policeVerified: false,
  aadhaarVerified: false,
  status: "AVAILABLE",
};
type Draft = typeof empty;
export function AdminDirectory() {
  const [workers, setWorkers] = useState<Worker[]>([]),
    [draft, setDraft] = useState<Draft | null>(null),
    [id, setId] = useState<string | null>(null),
    [file, setFile] = useState<File | null>(null),
    [contactReviewed, setContactReviewed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [places, setPlaces] = useState<
      { label: string; latitude: number; longitude: number }[]
    >([]);
  const load = useCallback(async () => {
    const r = await fetch("/api/admin/workers");
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    setWorkers(d.workers);
  }, []);
  useEffect(() => {
    void Promise.resolve()
      .then(load)
      .catch((e) => setError(e.message));
  }, [load]);
  async function api(p: string, method: string, body: unknown) {
    const r = await fetch("/api/admin/workers" + p, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    return d;
  }
  function edit(w?: Worker) {
    setError("");
    setNotice("");
    setFile(null);
    setContactReviewed(false);
    setPlaces([]);
    setId(w?.id ?? null);
    setDraft(
      w
        ? (Object.fromEntries(
            Object.keys(empty).map((k) => [
              k,
              typeof empty[k as keyof Draft] === "boolean"
                ? Boolean(w[k])
                : String(w[k] ?? empty[k as keyof Draft]),
            ]),
          ) as Draft)
        : { ...empty },
    );
  }
  async function pin() {
    if (!draft) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch(
        "/api/locations?q=" +
          encodeURIComponent(
            [draft.area, draft.city].filter(Boolean).join(", "),
          ),
      );
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setPlaces(d.places);
      if (!d.places.length)
        setError(
          "No location found. Try a nearby landmark or a more specific area.",
        );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to find location");
    } finally {
      setBusy(false);
    }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    if (file && !contactReviewed) {
      setError("Review the resume and remove contact details before uploading.");
      return;
    }
    setBusy(true);
    setError("");
    let saved = id;
    try {
      const body = { ...draft };
      if (!saved) {
        const d = await api("", "POST", { ...body, status: "INACTIVE" });
        saved = d.worker.id;
        setId(saved);
      } else await api("/" + saved, "PATCH", body);
      if (file) {
        const form = new FormData();
        form.append("file", file);
        form.append("contactReviewed", "true");
        const r = await fetch("/api/admin/workers/" + saved + "/resume", {
          method: "POST",
          body: form,
        });
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
      }
      await api("/" + saved, "PATCH", { status: draft.status });
      await load();
      setDraft(null);
      setNotice(
        "Profile saved. Available profiles appear in the public directory.",
      );
    } catch (e) {
      setError(
        (e instanceof Error ? e.message : "Unable to save") +
          (saved
            ? " The profile is saved; you can retry the resume upload here."
            : ""),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="bw-workspace">
      <div className="bw-page-head">
        <div>
          <p className="bw-eyebrow">DIRECTORY MANAGEMENT</p>
          <h2>Worker profiles & resumes</h2>
          <p>
            Add the details families browse and upload the resume they can
            unlock.
          </p>
        </div>
        <button className="bw-button" onClick={() => edit()}>
          + Add worker
        </button>
      </div>
      {error && (
        <p role="alert" className="bw-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="bw-notice">
          {notice}
        </p>
      )}
      {draft && (
        <form onSubmit={save} className="bw-card bw-form">
          <div className="bw-card-head">
            <h2>{id ? "Edit worker profile" : "Add a worker"}</h2>
            <button
              className="bw-text-button"
              type="button"
              onClick={() => setDraft(null)}
            >
              Cancel
            </button>
          </div>
          <div className="bw-form-grid">
            {fields.map(([key, label]) => (
              <label className="bw-field" key={key}>
                {label}
                <input
                  list={key === "skill" ? "admin-worker-skills" : undefined}
                  required={["name", "phone", "city", "area"].includes(key)}
                  type={
                    [
                      "age",
                      "experienceYears",
                    ].includes(key)
                      ? "number"
                      : "text"
                  }
                  min={key === "age" ? 18 : 0}
                  max={key === "age" ? 100 : undefined}
                  step={1}
                  value={draft[key]}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      [key]: e.target.value,
                      ...(key === "city" || key === "area"
                        ? { latitude: "", longitude: "" }
                        : {}),
                    })
                  }
                />
              </label>
            ))}
            <datalist id="admin-worker-skills">
              {adminCategories.map((category) => (
                <option key={category} value={LABELS[category]} />
              ))}
            </datalist>
            <label className="bw-field">
              Type of help
              <select aria-label="Type of help"
                value={draft.category}
                onChange={(e) =>
                  setDraft({ ...draft, category: e.target.value })
                }
              >
                {!(adminCategories as readonly string[]).includes(draft.category) && (
                  <option value={draft.category} disabled>
                    {LABELS[draft.category]} (no longer offered)
                  </option>
                )}
                {adminCategories.map((c) => (
                  <option key={c} value={c}>
                    {LABELS[c]}
                  </option>
                ))}
              </select>
            </label>
            <label className="bw-field">
              Work arrangement
              <select aria-label="Work arrangement"
                value={draft.employmentType}
                onChange={(e) =>
                  setDraft({ ...draft, employmentType: e.target.value })
                }
              >
                {draft.employmentType === "FULL_TIME" && (
                  <option value="FULL_TIME" disabled>
                    Full time (no longer offered)
                  </option>
                )}
                <option value="PART_TIME">Part time</option>
                <option value="LIVE_IN">24 hours Live-in</option>
              </select>
            </label>
            <label className="bw-field">
              Food preferences
              <select
                aria-label="Food preferences"
                value={draft.vegNonVeg}
                onChange={(e) => setDraft({ ...draft, vegNonVeg: e.target.value })}
              >
                <option value="">Select food preference</option>
                {draft.vegNonVeg && !["Veg", "Veg + Non veg"].includes(draft.vegNonVeg) && (
                  <option value={draft.vegNonVeg} disabled>{draft.vegNonVeg}</option>
                )}
                <option value="Veg">Veg</option>
                <option value="Veg + Non veg">Veg + Non veg</option>
              </select>
            </label>
            <label className="bw-field">
              Directory visibility
              <select aria-label="Directory visibility"
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value })}
              >
                <option value="AVAILABLE">Available · show profile</option>
                <option value="PLACED">Placed · hide from search</option>
                <option value="INACTIVE">Draft / inactive · hide</option>
              </select>
            </label>
          </div>
          <label className="bw-field">
            About this worker
            <textarea
              value={draft.about}
              onChange={(e) => setDraft({ ...draft, about: e.target.value })}
              rows={3}
            />
          </label>
          <div className="bw-location">
            <strong>Location for nearby searches</strong>
            <p className="bw-muted">
              Find the worker’s neighbourhood to add a map pin. City and area
              searches also work without a pin.
            </p>
            <button
              type="button"
              className="bw-button secondary"
              disabled={busy}
              onClick={() => void pin()}
            >
              Find this neighbourhood
            </button>
            {places.map((p, i) => (
              <button
                key={i}
                type="button"
                className="bw-text-button"
                onClick={() => {
                  setDraft({
                    ...draft,
                    latitude: String(p.latitude),
                    longitude: String(p.longitude),
                  });
                  setPlaces([]);
                }}
              >
                {p.label}
              </button>
            ))}
            {draft.latitude && (
              <p className="bw-notice">
                ✓ Neighbourhood pinned.{" "}
                <a
                  href={
                    "https://www.openstreetmap.org/?mlat=" +
                    draft.latitude +
                    "&mlon=" +
                    draft.longitude +
                    "#map=15/" +
                    draft.latitude +
                    "/" +
                    draft.longitude
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  Check map ↗
                </a>
              </p>
            )}
            <small className="bw-muted">
              Location data ©{" "}
              <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noreferrer"
              >
                OpenStreetMap contributors
              </a>
            </small>
          </div>
          <div className="bw-actions">
            <label>
              <input
                type="checkbox"
                checked={draft.policeVerified}
                onChange={(e) =>
                  setDraft({ ...draft, policeVerified: e.target.checked })
                }
              />{" "}
              Police verified
            </label>
            <label>
              <input
                type="checkbox"
                checked={draft.aadhaarVerified}
                onChange={(e) =>
                  setDraft({ ...draft, aadhaarVerified: e.target.checked })
                }
              />{" "}
              Aadhaar verified
            </label>
          </div>
          <label className="bw-field">
            Worker resume
            <input
              aria-label="Worker resume"
              type="file"
              required={!id}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); setContactReviewed(false); }}
            />
            <small>
              PDF, Word or image · up to 4 MB. Existing resume is kept unless
              replaced.
            </small>
          </label>
          {file && <label className="bw-check">
            <input type="checkbox" required checked={contactReviewed} onChange={(e) => setContactReviewed(e.target.checked)} />
            I reviewed this resume and removed phone numbers, email addresses and other contact details.
          </label>}
          <button className="bw-button" disabled={busy}>
            {busy ? "Saving profile and resume…" : "Save profile & resume"}
          </button>
        </form>
      )}
      <div className="bw-directory-admin-list">
        {workers.map((w) => (
          <article key={w.id} className="bw-card">
            <div>
              <h3>{w.name}</h3>
              <p>
                {LABELS[w.category]} ·{" "}
                {[w.area, w.city].filter(Boolean).join(", ")} ·{" "}
                {w.status.toLowerCase()}
              </p>
              <p>
                {w.resumeFileName
                  ? "Resume: " + w.resumeFileName + (w.resumeContactReviewed ? " · Contact review complete" : " · Review and re-upload before families can access")
                  : "No resume uploaded"}
              </p>
              <p>Private contact: {w.phone}</p>
            </div>
            <button className="bw-button secondary" onClick={() => edit(w)}>
              Edit profile / resume
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
