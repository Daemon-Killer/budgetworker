"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { SERVICES } from "@/lib/services";
import styles from "./ServicesMenu.module.css";

export function ServicesMenu({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    function closeOutside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    }

    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div
      ref={root}
      className={`${styles.menu} ${variant === "desktop" ? "bw-desktop-only" : styles.mobile}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        className={`${styles.trigger} ${path === "/services" || path.startsWith("/services/") ? styles.active : ""}`}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        Services
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className={open ? styles.expanded : undefined}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div id={panelId} className={styles.panel}>
          <ul aria-label="Service options" className={styles.list}>
            {SERVICES.map((service) => (
              <li key={service.slug}>
                <Link href={`/services/${service.slug}`} className={styles.serviceLink} prefetch={false} onClick={() => setOpen(false)}>
                  {service.title}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/services" className={styles.allServices} prefetch={false} onClick={() => setOpen(false)}>
            All services →
          </Link>
        </div>
      )}
    </div>
  );
}
