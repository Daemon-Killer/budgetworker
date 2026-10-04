"use client";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { emptyFilters } from "../../../shared/directory";
import type { WorkerCategory } from "@/lib/constants";
import styles from "./ServiceCards.module.css";

export type ServiceCard = {
  category: WorkerCategory;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  imagePosition?: string;
  imageFit?: "contain" | "cover";
};

export function ServiceCards({
  services,
  params = {},
}: {
  services: ServiceCard[];
  params?: Record<string, string | string[] | undefined>;
}) {
  const currentParams = useSearchParams();
  const criteria = new URLSearchParams();
  for (const key of Object.keys(emptyFilters)) {
    const value = currentParams ? currentParams.get(key) : params[key];
    if (typeof value === "string" && value) criteria.set(key, value);
  }
  const allCriteria = new URLSearchParams(criteria);
  allCriteria.delete("category");

  return (
    <section id="services" className={styles.section} aria-labelledby="services-heading">
      <div className={styles.heading}>
        <div>
          <p className="bw-eyebrow">HELP FOR EVERY PART OF HOME</p>
          <h2 id="services-heading">What kind of help do you need?</h2>
          <p>Choose a service, then find workers who fit your location, hours and budget.</p>
        </div>
        <Link href={"/workers" + (allCriteria.size ? "?" + allCriteria.toString() : "")} className="bw-text-button">Browse all workers <span aria-hidden="true">→</span></Link>
      </div>
      <ul className={styles.grid}>
        {services.map((service) => {
          const search = new URLSearchParams(criteria);
          search.set("category", service.category);
          return (
            <li key={service.category}>
              <Link href={"/workers?" + search.toString()} prefetch={false} className={styles.card}>
                <div className={styles.image}>
                  <Image
                    src={service.image}
                    alt={service.imageAlt}
                    fill
                    sizes="(max-width: 760px) 50vw, (max-width: 1152px) 33vw, 360px"
                    style={{ objectPosition: service.imagePosition ?? "center", objectFit: service.imageFit ?? "contain" }}
                  />
                  <span className={styles.arrow} aria-hidden="true">↗</span>
                </div>
                <div className={styles.copy}>
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                  <span className={styles.action}>Find workers <span aria-hidden="true">→</span></span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
