"use client";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { emptyFilters } from "../../../shared/directory";
import type { ServiceCard } from "@/lib/services";
import styles from "./ServiceCards.module.css";

export function ServiceCards({
  services,
  params = {},
}: {
  services: ServiceCard[];
  params?: Record<string, string | string[] | undefined>;
}) {
  const currentParams = useSearchParams();
  const carouselRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLUListElement>(null);
  const interactingRef = useRef(false);
  const resumeAtRef = useRef(0);
  const hoveredRef = useRef(false);
  const focusedRef = useRef(false);

  useEffect(() => {
    const carousel = carouselRef.current;
    const viewport = viewportRef.current;
    const group = groupRef.current;
    if (!carousel || !viewport || !group) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let previousTime = 0;
    let groupWidth = group.getBoundingClientRect().width;
    let position = 0;
    let visible = !("IntersectionObserver" in window);
    const observer = "IntersectionObserver" in window ? new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      previousTime = 0;
    }) : undefined;
    observer?.observe(viewport);

    const resize = new ResizeObserver(() => {
      groupWidth = group.getBoundingClientRect().width;
    });
    resize.observe(group);

    // Decreasing scrollLeft moves the cards right. The second copy makes the loop seamless.
    const move = (time: number) => {
      const elapsed = previousTime ? Math.min(time - previousTime, 64) : 0;
      previousTime = time;
      if (visible && !document.hidden && !interactingRef.current && time >= resumeAtRef.current && !hoveredRef.current && !focusedRef.current && groupWidth > 0) {
        position -= elapsed * 0.028;
        if (position <= 0) position += groupWidth;
        if (position > groupWidth) position %= groupWidth;
        viewport.scrollLeft = position;
      } else position = viewport.scrollLeft;
      frame = requestAnimationFrame(move);
    };

    const updateMotion = () => {
      cancelAnimationFrame(frame);
      previousTime = 0;
      carousel.dataset.autoplay = String(!motion.matches);
      groupWidth = group.getBoundingClientRect().width;
      position = motion.matches ? 0 : groupWidth;
      viewport.scrollLeft = position;
      if (!motion.matches) frame = requestAnimationFrame(move);
    };
    updateMotion();
    motion.addEventListener("change", updateMotion);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      resize.disconnect();
      motion.removeEventListener("change", updateMotion);
      delete carousel.dataset.autoplay;
    };
  }, [services]);

  function finishInteraction() {
    interactingRef.current = false;
    focusedRef.current = false;
    // Let touch scrolling settle before the cards start moving again.
    resumeAtRef.current = performance.now() + 1500;
  }

  function browseCards(direction: number) {
    const viewport = viewportRef.current;
    const group = groupRef.current;
    const item = group?.firstElementChild;
    if (!viewport || !group || !item) return;
    const distance = item.getBoundingClientRect().width + parseFloat(getComputedStyle(group).columnGap);
    const groupWidth = group.getBoundingClientRect().width;
    if (carouselRef.current?.dataset.autoplay === "true") {
      if (direction < 0 && viewport.scrollLeft < distance) viewport.scrollLeft += groupWidth;
      if (direction > 0 && viewport.scrollLeft + distance > viewport.scrollWidth - viewport.clientWidth) viewport.scrollLeft -= groupWidth;
    }
    viewport.scrollBy({ left: direction * distance, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  const criteria = new URLSearchParams();
  for (const key of Object.keys(emptyFilters)) {
    const value = currentParams ? currentParams.get(key) : params[key];
    if (typeof value === "string" && value) criteria.set(key, value);
  }

  return (
    <section id="services" className={styles.section} aria-label="Services">
      <div className={styles.carousel} ref={carouselRef}>
        <div
          className={styles.viewport}
          ref={viewportRef}
          tabIndex={0}
          role="region"
          aria-label="Service cards"
          onPointerEnter={(event) => { if (event.pointerType === "mouse") hoveredRef.current = true; }}
          onPointerLeave={() => { hoveredRef.current = false; }}
          onPointerDown={(event) => { if (event.pointerType !== "mouse") interactingRef.current = true; }}
          onPointerUp={(event) => { if (event.pointerType !== "mouse") finishInteraction(); }}
          onPointerCancel={(event) => { if (event.pointerType !== "mouse") finishInteraction(); }}
          onFocusCapture={() => { focusedRef.current = true; }}
          onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) focusedRef.current = false; }}
          onWheel={(event) => { if (event.deltaX) resumeAtRef.current = performance.now() + 1500; }}
          onScroll={() => {
            if (interactingRef.current || performance.now() < resumeAtRef.current) resumeAtRef.current = performance.now() + 1500;
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              browseCards(event.key === "ArrowLeft" ? -1 : 1);
            }
          }}
        >
          <div className={styles.track}>
            {[false, true].map((duplicate) => (
              <ul key={String(duplicate)} className={[styles.group, duplicate && styles.duplicate].filter(Boolean).join(" ")} ref={duplicate ? undefined : groupRef} aria-hidden={duplicate ? true : undefined}>
                {services.map((service) => {
                  const search = new URLSearchParams(criteria);
                  search.set("category", service.category);
                  if (service.employmentType) search.set("employmentType", service.employmentType);
                  return (
                    <li key={`${service.category}-${service.employmentType ?? "any"}`} className={styles.item}>
                      <Link href={`/services/${service.slug}?${search}`} prefetch={false} tabIndex={duplicate ? -1 : undefined} className={[styles.card, !service.image && styles.withoutImage].filter(Boolean).join(" ")}>
                        {service.image && <div className={styles.image}>
                          <Image
                            src={service.image}
                            alt={service.imageAlt ?? ""}
                            fill
                            sizes="(max-width: 760px) 280px, 265px"
                            style={{ objectPosition: service.imagePosition ?? "center", objectFit: service.imageFit ?? "contain" }}
                          />
                          <span className={styles.arrow} aria-hidden="true">↗</span>
                        </div>}
                        <div className={styles.copy}>
                          <h3>{service.title}</h3>
                          <p>{service.description}</p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
