"use client";
import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import {useRouter} from 'next/navigation';
import { PackPurchase } from "@/app/packs/PackPurchase";
import type { DirectoryWorker, ResumePack } from "../../../shared/directory";
export function ResumeAccess({
  worker,
  packs,
  loggedIn,
  balance,
  onUnlock,
}: {
  worker: DirectoryWorker;
  packs: ResumePack[];
  loggedIn: boolean;
  balance: number;
  onUnlock?: () => void;
}) {
  const router=useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [ready, setReady] = useState(worker.unlocked);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  async function unlock() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/workers/" + worker.id + "/unlock", {
        method: "POST",
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error ?? "Unable to unlock");
      setReady(true);
      setOpen(false);
      onUnlock?.();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to unlock");
    } finally {
      setBusy(false);
    }
  }
  if (!worker.hasResume)
    return <span className="bw-muted">Resume coming soon</span>;
  if (ready || worker.unlocked)
    return (
      <a className="bw-button" href={"/api/workers/" + worker.id + "/resume"}>
        Open resume ↗
      </a>
    );
  return (
    <>
      <button className="bw-button" onClick={() => setOpen(true)}>
        View resume <span aria-hidden="true">↗</span>
      </button>
      <dialog
        ref={dialog}
        className="bw-paywall"
        onCancel={() => setOpen(false)}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
        aria-labelledby={"resume-title-" + worker.id}
      >
        <div className="bw-card-head">
          <span className="bw-tag">RESUME ACCESS</span>
          <button
            className="bw-text-button"
            aria-label="Close resume plans"
            onClick={() => setOpen(false)}
          >
            Close ×
          </button>
        </div>
        <h2 id={"resume-title-" + worker.id}>
          {balance > 0 && loggedIn
            ? "Use one resume credit"
            : "Meet your next home helper"}
        </h2>
        <p className="bw-description">
          {worker.name}’s profile is free to browse. One credit unlocks their
          full resume. You can open it again without using another credit.
        </p>
        {error && (
          <p role="alert" className="bw-error">
            {error}
          </p>
        )}
        {loggedIn && balance > 0 ? (
          <>
            <p className="bw-muted">Your balance: {balance} resume credits</p>
            <button
              className="bw-button"
              disabled={busy}
              onClick={() => void unlock()}
            >
              {busy ? "Unlocking…" : "Unlock this resume · 1 credit"}
            </button>
          </>
        ) : (
          <>
            <p className="bw-muted">
              Choose a plan below. 1 credit = 1 worker resume.
            </p>
            <div className="bw-plan-grid">
              {packs.map((p) => (
                <article key={p.id}>
                  <h3>{p.name}</h3>
                  <strong>₹{p.priceInr}</strong>
                  <p>
                    {p.credits} resume{p.credits === 1 ? "" : "s"} · ₹
                    {Math.round(p.priceInr / p.credits)} each
                  </p>
                  {loggedIn ? (
                    <PackPurchase packId={p.id} loggedIn />
                  ) : (
                    <Link
                      className="bw-button"
                      href={
                        "/login?next=" +
                        encodeURIComponent("/workers/" + worker.id)
                      }
                    >
                      Log in to choose
                    </Link>
                  )}
                </article>
              ))}
            </div>
            {packs.length === 0 && (
              <p>Plans are being updated. Please check back shortly.</p>
            )}
          </>
        )}
      </dialog>
    </>
  );
}
