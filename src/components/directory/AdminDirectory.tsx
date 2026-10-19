"use client";
import { useCallback, useEffect, useState } from "react";
import { CATEGORIES, LABELS } from "../../../shared/marketplace";
import { PREFERRED_LANGUAGES, selectedLanguages } from "../../../shared/languages";
import { parseExperience } from "../../../shared/experience";
const adminCategories = CATEGORIES.filter((category) => category !== "CHEF");
type Worker = {
  id: string;
  name: string;
  phone: string;
  documents?: { kind: string; fileName: string }[];
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
  ["skill", "Skills"],
  ["workingLocation", "Preferred work area"],
] as const;
const empty = {
  name: "",
  phone: "",
  additionalPhone: "",
  category: "HOUSEKEEPING",
  secondaryCategory: "",
  employmentType: "PART_TIME",
  city: "Pune",
  area: "",
  age: "",
  experienceYears: "",
  experienceCategories: "",
  experienceBreakdown: "{}",
  skill: "",
  about: "",
  whenCanJoin: "",
  workingLocation: "",
  vegNonVeg: "",
  religion: "",
  englishLanguage: "",
  qualification: "",
  preferredLanguage: "",
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
    [photo, setPhoto] = useState<File | null>(null),
    [aadhaar, setAadhaar] = useState<File | null>(null),
    [contactReviewed, setContactReviewed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [resumeDownload, setResumeDownload] = useState<string | null>(null),
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
    setResumeDownload(null);
    setFile(null);
    setPhoto(null);
    setAadhaar(null);
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
      for (const selected of [photo, aadhaar]) {
        if (selected && selected.size > 2 * 1024 * 1024)
          throw Error("Photo and Aadhaar files must each be 2 MB or smaller.");
      }
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
      for (const [kind, selected] of [["PHOTO", photo], ["AADHAAR", aadhaar]] as const) {
        if (!selected) continue;
        const r = await fetch(`/api/admin/workers/${saved}/documents?kind=${kind}`, {
          method: "PUT", body: selected,
          headers: { "Content-Type": selected.type || "application/octet-stream" },
        });
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
      }
      if (!file) {
        const r = await fetch(`/api/admin/workers/${saved}/resume/generate`, { method: "POST" });
        const d = await r.json();
        if (!r.ok) throw Error(d.error || "Unable to generate resume");
      }
      await api("/" + saved, "PATCH", { status: draft.status });
      await load();
      setDraft(null);
      setResumeDownload(`/api/admin/workers/${saved}/resume`);
      setNotice(
        "Profile saved. Your resume is ready to download.",
      );
    } catch (e) {
      setError(
        (e instanceof Error ? e.message : "Unable to save") +
          (saved
            ? " The profile is saved; you can retry any pending uploads here."
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
            Add worker details and save to create a professional PDF resume.
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
      {resumeDownload && <a className="bw-button" href={resumeDownload}>Download resume</a>}
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
              <div className="bw-field" key={key}>
              <label className="bw-field">
                {label}
                {key === "skill" ? (
                  <select
                    aria-label="Skills"
                    value={draft.skill}
                    onChange={(e) => setDraft({ ...draft, skill: e.target.value })}
                  >
                    <option value="">Select skill</option>
                    {draft.skill && !adminCategories.some((category) => LABELS[category] === draft.skill) && (
                      <option value={draft.skill}>{draft.skill} (saved skill)</option>
                    )}
                    {adminCategories.map((category) => (
                      <option key={category} value={LABELS[category]}>{LABELS[category]}</option>
                    ))}
                  </select>
                ) : key === "city" ? (
                  <select
                    aria-label="City"
                    required
                    value={draft.city}
                    onChange={(e) => setDraft({ ...draft, city: e.target.value, latitude: "", longitude: "" })}
                  >
                    <option value="">Select city</option>
                    {draft.city && !["Delhi", "New Delhi", "Gurgaon", "Noida", "Greater Noida", "Faridabad", "Ghaziabad", "Pune", "Mumbai", "Navi Mumbai", "Thane"].includes(draft.city) && (
                      <option value={draft.city}>{draft.city} (saved city)</option>
                    )}
                    {["Delhi", "New Delhi", "Gurgaon", "Noida", "Greater Noida", "Faridabad", "Ghaziabad", "Pune", "Mumbai", "Navi Mumbai", "Thane"].map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                ) : <input
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
                      ...(key === "area"
                        ? { latitude: "", longitude: "" }
                        : {}),
                    })
                  }
                />}
              </label>
              {key === "phone" && (
                <label className="bw-field">
                  Additional no (private)
                  <input
                    type="tel"
                    value={draft.additionalPhone}
                    onChange={(e) => setDraft({ ...draft, additionalPhone: e.target.value })}
                  />
                </label>
              )}
              </div>
            ))}
            <div className="bw-field">
              Type of help (select up to 2)
              <details className="bw-help-dropdown">
                <summary>
                  <span>{[draft.category, draft.secondaryCategory].filter(Boolean).map((c) => LABELS[c]).join(", ")}</span>
                  <span aria-hidden="true" className="bw-help-chevron">⌄</span>
                </summary>
                <fieldset aria-label="Type of help">
                  <legend>Select 1 or 2 types of help</legend>
                  {!(adminCategories as readonly string[]).includes(draft.category) && (
                    <p>{LABELS[draft.category]} (no longer offered)</p>
                  )}
                {adminCategories.map((c) => (
                  <label key={c} className="bw-help-option">
                    <input
                      type="checkbox"
                      checked={draft.category === c || draft.secondaryCategory === c}
                      disabled={Boolean(draft.secondaryCategory) && draft.category !== c && draft.secondaryCategory !== c}
                      onChange={(e) => {
                        const selected = [draft.category, draft.secondaryCategory].filter(Boolean);
                        const next = e.target.checked
                          ? [...selected.filter((value) => (adminCategories as readonly string[]).includes(value)), c]
                          : selected.filter((value) => value !== c);
                        if (next.length) setDraft({ ...draft, category: next[0], secondaryCategory: next[1] || "" });
                      }}
                    />
                    {LABELS[c]}
                  </label>
                ))}
                  <p className="bw-help-hint">Choose up to 2. Uncheck a choice to select another.</p>
                </fieldset>
              </details>
            </div>
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
              Religion (optional)
              <select
                aria-label="Religion (optional)"
                value={draft.religion}
                onChange={(e) => setDraft({ ...draft, religion: e.target.value })}
              >
                <option value="">Select religion</option>
                {draft.religion && !["Hindu", "Muslim", "Other religion"].includes(draft.religion) && (
                  <option value={draft.religion} disabled>{draft.religion}</option>
                )}
                <option value="Hindu">Hindu</option>
                <option value="Muslim">Muslim</option>
                <option value="Other religion">Other religion</option>
              </select>
            </label>
            <label className="bw-field">
              English language
              <select
                aria-label="English language"
                value={draft.englishLanguage}
                onChange={(e) => setDraft({ ...draft, englishLanguage: e.target.value })}
              >
                <option value="">Select English level</option>
                <option value="No English">No English</option>
                <option value="Thoda English">Thoda English</option>
                <option value="Good English">Good English</option>
                <option value="Fluent English">Fluent English</option>
              </select>
            </label>
            <label className="bw-field">
              Qualification
              <select
                aria-label="Qualification"
                value={draft.qualification}
                onChange={(e) => setDraft({ ...draft, qualification: e.target.value })}
              >
                <option value="">Select qualification</option>
                <option value="Below 10th pass">Below 10th pass</option>
                <option value="10th pass">10th pass</option>
                <option value="12th pass">12th pass</option>
                <option value="Graduation">Graduation</option>
              </select>
            </label>
            <div className="bw-field">
              Preferred language (select up to 4)
              <details className="bw-help-dropdown">
                <summary>
                  <span>{draft.preferredLanguage || "Select preferred languages"}</span>
                  <span aria-hidden="true" className="bw-help-chevron">⌄</span>
                </summary>
                <fieldset aria-label="Preferred language">
                  <legend>Select up to 4 preferred languages</legend>
                  {PREFERRED_LANGUAGES.map((language) => {
                    const selected = selectedLanguages(draft.preferredLanguage);
                    const checked = selected.includes(language);
                    return <label key={language} className="bw-help-option">
                      <input type="checkbox" checked={checked} disabled={!checked && selected.length >= 4}
                        onChange={(e) => setDraft({ ...draft, preferredLanguage: (e.target.checked ? [...selected, language] : selected.filter((value) => value !== language)).join(", ") })} />
                      {language}
                    </label>;
                  })}
                  <p className="bw-help-hint">Choose up to 4. Uncheck a language to select another.</p>
                </fieldset>
              </details>
            </div>
            <label className="bw-field">
              Can join from
              <select
                aria-label="Can join from"
                value={draft.whenCanJoin}
                onChange={(e) => setDraft({ ...draft, whenCanJoin: e.target.value })}
              >
                <option value="">Select joining availability</option>
                {draft.whenCanJoin && !["Immediately", "Between 4-7 days", "After 7 days", "After 15 days"].includes(draft.whenCanJoin) && (
                  <option value={draft.whenCanJoin} disabled>{draft.whenCanJoin}</option>
                )}
                <option value="Immediately">Immediately</option>
                <option value="Between 4-7 days">Between 4-7 days</option>
                <option value="After 7 days">After 7 days</option>
                <option value="After 15 days">After 15 days</option>
              </select>
            </label>
            <label className="bw-field">
              Years of experience
              <select
                aria-label="Years of experience"
                value={draft.experienceYears}
                onChange={(e) => setDraft({ ...draft, experienceYears: e.target.value })}
              >
                <option value="">Select experience</option>
                {draft.experienceYears && Number(draft.experienceYears) > 10 && (
                  <option value={draft.experienceYears}>10+ years ({draft.experienceYears} years saved)</option>
                )}
                {Array.from({ length: 11 }, (_, years) => (
                  <option key={years} value={String(years)}>
                    {years === 10 ? "10+ years" : `${years}-${years + 1} years`}
                  </option>
                ))}
              </select>
            </label>
            <div className="bw-field">
              Experience in (select all that apply)
              <details className="bw-help-dropdown">
                <summary>
                  <span>{draft.experienceCategories ? draft.experienceCategories.split(",").map((category) => LABELS[category]).join(", ") : "Select experience categories"}</span>
                  <span aria-hidden="true" className="bw-help-chevron">⌄</span>
                </summary>
                <fieldset aria-label="Experience in">
                  <legend>Select the services the worker has experience in</legend>
                  {adminCategories.map((category) => {
                    const selected = draft.experienceCategories.split(",").filter(Boolean);
                    return <label key={category} className="bw-help-option">
                      <input type="checkbox" checked={selected.includes(category)} onChange={(e) => {
                        const breakdown = parseExperience(draft.experienceBreakdown);
                        if (!e.target.checked) delete breakdown[category];
                        setDraft({ ...draft, experienceCategories: (e.target.checked ? [...selected, category] : selected.filter((value) => value !== category)).join(","), experienceBreakdown: JSON.stringify(breakdown), ...(Object.keys(breakdown).length ? { experienceYears: String(Object.values(breakdown).reduce((sum, years) => sum + years, 0)) } : {}) });
                      }} />
                      {LABELS[category]}
                    </label>;
                  })}
                  <p className="bw-help-hint">Enter years separately below. Total experience is calculated from those years. Leave all blank to use the shared total.</p>
                </fieldset>
              </details>
              {draft.experienceCategories.split(",").filter(Boolean).map((category) => (
                <label className="bw-field" key={category}>
                  {LABELS[category]} experience (years)
                  <input type="number" min={0} max={80} step={1} value={parseExperience(draft.experienceBreakdown)[category] ?? ""}
                    onChange={(e) => {
                      const breakdown = parseExperience(draft.experienceBreakdown);
                      if (e.target.value === "") delete breakdown[category]; else breakdown[category] = Number(e.target.value);
                      setDraft({ ...draft, experienceBreakdown: JSON.stringify(breakdown), ...(Object.keys(breakdown).length ? { experienceYears: String(Object.values(breakdown).reduce((sum, years) => sum + years, 0)) } : {}) });
                    }} />
                </label>
              ))}
            </div>
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
          <div className="bw-form-grid">
            <label className="bw-field">
              Worker photo
              <input aria-label="Worker photo" type="file" accept="image/jpeg,image/png" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
              <small>JPG or PNG · up to 2 MB. Used as the profile photo.</small>
            </label>
            <label className="bw-field">
              Aadhaar card (private)
              <input aria-label="Aadhaar card (private)" type="file" accept="image/jpeg,image/png,application/pdf" onChange={(e) => setAadhaar(e.target.files?.[0] ?? null)} />
              <small>JPG, PNG or PDF · up to 2 MB. Admin access only; uploading resets Aadhaar verification.</small>
            </label>
          </div>
          {id && workers.find((w) => w.id === id)?.documents?.filter((d) => ["PHOTO", "AADHAAR"].includes(d.kind)).map((d) => (
            <a key={d.kind} className="bw-text-button" href={`/api/admin/workers/${id}/documents?kind=${d.kind}`}>
              Download saved {d.kind === "PHOTO" ? "worker photo" : "Aadhaar card"}
            </a>
          ))}
          <label className="bw-field">
            Upload your own resume (optional)
            <input
              aria-label="Worker resume"
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); setContactReviewed(false); }}
            />
            <small>
              Leave empty to generate a professional PDF from the profile. Or upload PDF, Word or image · up to 4 MB.
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
            {w.resumeFileName && <a className="bw-text-button" href={`/api/admin/workers/${w.id}/resume`}>Download resume</a>}
          </article>
        ))}
      </div>
    </div>
  );
}
