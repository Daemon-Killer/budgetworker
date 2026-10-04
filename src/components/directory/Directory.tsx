"use client";
import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { CATEGORIES, LABELS } from "../../../shared/marketplace";
import {
  directoryQuery,
  periodLabels,
  type DirectoryFilters,
  type DirectoryResult,
  type ResumePack,
} from "../../../shared/directory";
import { ResumeAccess } from "./ResumeAccess";
export function Directory({
  initial,
  initialFilters,
  packs,
  loggedIn,
  balance,
}: {
  initial: DirectoryResult;
  initialFilters: DirectoryFilters;
  packs: ResumePack[];
  loggedIn: boolean;
  balance: number;
}) {
  const [filters, setFilters] = useState(initialFilters),
    [appliedFilters, setAppliedFilters] = useState(initialFilters),
    [result, setResult] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [locationBusy, setLocationBusy] = useState(false);
  const requestNumber = useRef(0);
  const field = (key: keyof DirectoryFilters, value: string) =>
    setFilters((f) => ({
      ...f,
      [key]: value,
      ...(key === "city" || key === "area" ? { lat: "", lng: "" } : {}),
    }));
  const search = useCallback(async (f: DirectoryFilters, page = 1) => {
    const n = ++requestNumber.current;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/workers?" + directoryQuery(f, page));
      const d = await r.json();
      if (!r.ok) throw Error(d.error ?? "Unable to load profiles");
      if (n === requestNumber.current) {
        setResult(d);
        setAppliedFilters(f);
        window.history.replaceState(null, "", "?" + directoryQuery(f, page));
      }
    } catch (e) {
      if (n === requestNumber.current)
        setError(e instanceof Error ? e.message : "Unable to load profiles");
    } finally {
      if (n === requestNumber.current) setBusy(false);
    }
  }, []);
  function locate() {
    setError("");
    if (!navigator.geolocation) {
      setError("Location is unavailable. Choose a city and area below.");
      return;
    }
    setLocationBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const f = {
          ...filters,
          city: "",
          area: "",
          lat: String(p.coords.latitude),
          lng: String(p.coords.longitude),
        };
        setFilters(f);
        setLocationBusy(false);
        void search(f);
      },
      () => {
        setLocationBusy(false);
        setError(
          "Location access was not available. You can choose a city and area instead.",
        );
      },
      { timeout: 15000, maximumAge: 60000 },
    );
  }
  return (
    <section className="bw-directory" aria-label="Worker directory">
      <div className="bw-page-head">
        <div>
          <p className="bw-eyebrow">YOUR HOME. YOUR CRITERIA.</p>
          <h2>{appliedFilters.category ? `${LABELS[appliedFilters.category]} workers` : "Find the help that fits"}</h2>
          <p>Browse every profile for free. Pay only to unlock a resume.</p>
        </div>
        <Link href="/packs" className="bw-text-button">
          View resume plans →
        </Link>
      </div>
      <div className="bw-directory-layout">
        <form
          className="bw-directory-filters"
          onSubmit={(e) => {
            e.preventDefault();
            void search(filters);
          }}
        >
          <h3>Where do you need help?</h3>
          <button
            className="bw-button secondary"
            type="button"
            onClick={locate}
            disabled={locationBusy}
          >
            {locationBusy ? "Finding your location…" : "◎ Use my location"}
          </button>
          {filters.lat ? (
            <>
              <p className="bw-notice">
                Showing profiles within {filters.radius} km of your location.
              </p>
              <label className="bw-field">
                Search radius
                <select
                  value={filters.radius}
                  onChange={(e) => field("radius", e.target.value)}
                >
                  {[5, 10, 20, 50].map((n) => (
                    <option key={n} value={n}>
                      {n} km
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="bw-text-button"
                onClick={() => setFilters((f) => ({ ...f, lat: "", lng: "" }))}
              >
                Choose a location instead
              </button>
            </>
          ) : (
            <>
              <label className="bw-field">
                City
                <input
                  placeholder="e.g. Pune"
                  value={filters.city}
                  onChange={(e) => field("city", e.target.value)}
                />
              </label>
              <label className="bw-field">
                Area / neighbourhood
                <input
                  placeholder="e.g. Baner"
                  value={filters.area}
                  onChange={(e) => field("area", e.target.value)}
                />
              </label>
            </>
          )}
          <label className="bw-field">
            Type of help
            <select
              value={filters.category}
              onChange={(e) => field("category", e.target.value)}
            >
              <option value="">All types</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          <label className="bw-field">
            Work arrangement
            <select
              value={filters.employmentType}
              onChange={(e) => field("employmentType", e.target.value)}
            >
              <option value="">Any arrangement</option>
              <option value="PART_TIME">Part time</option>
              <option value="FULL_TIME">Full time</option>
            </select>
          </label>
          <label className="bw-field">
            Daily hours
            <select
              value={filters.maxHours}
              onChange={(e) => field("maxHours", e.target.value)}
            >
              <option value="">Any duration</option>
              {[2, 4, 8, 12].map((n) => (
                <option key={n} value={n}>
                  Up to {n} hours / day
                </option>
              ))}
            </select>
          </label>
          <label className="bw-field">
            Maximum expected pay (₹)
            <input
              type="number"
              min="1"
              max="1000000"
              placeholder="Any budget"
              value={filters.maxPay}
              onChange={(e) => field("maxPay", e.target.value)}
            />
          </label>
          <label className="bw-field">
            Budget period
            <select
              value={filters.payPeriod}
              onChange={(e) => field("payPeriod", e.target.value)}
            >
              {Object.entries(periodLabels).map(([key, value]) => (
                <option key={key} value={key}>
                  Per {value}
                </option>
              ))}
            </select>
          </label>
          <label className="bw-field">
            Skills or name
            <input
              value={filters.q}
              onChange={(e) => field("q", e.target.value)}
              placeholder="e.g. vegetarian cooking"
            />
          </label>
          <button className="bw-button" disabled={busy}>
            {busy ? "Searching…" : "Show matching workers"}
          </button>
          <button
            type="button"
            className="bw-text-button"
            onClick={() => {
              const f = {
                ...initialFilters,
                city: "",
                area: "",
                category: "",
                employmentType: "",
                maxPay: "",
                maxHours: "",
                q: "",
                lat: "",
                lng: "",
              };
              setFilters(f);
              void search(f);
            }}
          >
            Clear filters
          </button>
        </form>
        <div className="bw-directory-results" aria-busy={busy}>
          {error && (
            <p className="bw-error" role="alert">
              {error}
            </p>
          )}
          <div className="bw-result-summary" role="status">
            <strong>
              {result.total} matching profile{result.total === 1 ? "" : "s"}
            </strong>
            <span>{appliedFilters.lat ? "Nearest first" : "Recently updated"}</span>
          </div>
          {result.workers.length === 0 ? (
            <div className="bw-empty">
              <h3>No workers match yet</h3>
              <p>Try another area or loosen your budget and hours filters.</p>
              {filters.lat && (
                <p>
                  Nearby search includes profiles with a pinned location. You
                  can also search by city and area.
                </p>
              )}
            </div>
          ) : (
            result.workers.map((w) => (
              <article className="bw-profile-row" key={w.id}>
                <div>
                  <div className="bw-profile-heading">
                    <span className="bw-avatar" aria-hidden="true">
                      {w.name.slice(0, 1)}
                    </span>
                    <div>
                      <h3>
                        <Link href={"/workers/" + w.id}>{w.name}</Link>
                      </h3>
                      <p>
                        {LABELS[w.category]} ·{" "}
                        {w.employmentType === "PART_TIME"
                          ? "Part time"
                          : "Full time"}
                      </p>
                    </div>
                    <span className="bw-tag">Available</span>
                  </div>
                  <p className="bw-profile-location">
                    {[w.area, w.city].filter(Boolean).join(", ")}
                    {w.distanceKm !== undefined
                      ? " · Approx. " + w.distanceKm + " km away"
                      : ""}
                  </p>
                  <div className="bw-profile-facts">
                    <span>
                      {w.experienceYears == null
                        ? "Experience not specified"
                        : w.experienceYears + " years’ experience"}
                    </span>
                    <span>
                      {w.hoursPerDay == null
                        ? "Hours to discuss"
                        : w.hoursPerDay + " hours / day"}
                    </span>
                    {w.age && <span>Age {w.age}</span>}
                  </div>
                  {w.skill && <p className="bw-description">{w.skill}</p>}
                  {w.about && <p className="bw-muted">{w.about}</p>}
                  <div className="bw-profile-facts">
                    {w.policeVerified && <span>✓ Police verified</span>}
                    {w.aadhaarVerified && <span>✓ Aadhaar verified</span>}
                    {w.whenCanJoin && <span>Can join: {w.whenCanJoin}</span>}
                  </div>
                </div>
                <aside className="bw-profile-resume">
                  <strong>
                    {w.expectedPayInr == null
                      ? w.salaryExpectation || "Pay to discuss"
                      : "₹" + w.expectedPayInr.toLocaleString("en-IN")}
                  </strong>
                  {w.expectedPayInr != null && (
                    <span>per {periodLabels[w.payPeriod]}</span>
                  )}
                  <ResumeAccess
                    worker={w}
                    packs={packs}
                    loggedIn={loggedIn}
                    balance={balance}
                    onUnlock={() => void search(filters, result.page)}
                  />
                  <p>1 credit · full resume</p>
                  <Link href={"/workers/" + w.id}>All profile details →</Link>
                </aside>
              </article>
            ))
          )}
          <div className="bw-actions">
            {result.page > 1 && (
              <button
                className="bw-button secondary"
                disabled={busy}
                onClick={() => void search(filters, result.page - 1)}
              >
                Previous
              </button>
            )}
            {result.page * result.pageSize < result.total && (
              <button
                className="bw-button secondary"
                disabled={busy}
                onClick={() => void search(filters, result.page + 1)}
              >
                Next profiles →
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
