import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SERVICES } from "@/lib/services";
import { emptyFilters } from "../../../shared/directory";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Services | BudgetWorker",
  description: "Explore domestic help, babycare, Japa care and 24 hours Live-in services.",
};

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const criteria = new URLSearchParams();
  for (const key of Object.keys(emptyFilters)) {
    const value = params[key];
    if (typeof value === "string" && value) criteria.set(key, value);
  }

  return (
    <section className={styles.page} aria-labelledby="services-page-heading">
      <div className={styles.heading}>
        <h1 id="services-page-heading">Services</h1>
        <p>Choose the help that fits your home.</p>
      </div>
      <ul className={styles.list} aria-label="All services">
        {SERVICES.map((service) => {
          const search = new URLSearchParams(criteria);
          search.set("category", service.category);
          if (service.employmentType) search.set("employmentType", service.employmentType);

          return (
            <li key={`${service.category}-${service.employmentType ?? "any"}`}>
              <Link href={`/services/${service.slug}?${search}`} className={styles.card} prefetch={false}>
                {service.image && (
                  <div className={styles.image}>
                    <Image
                      src={service.image}
                      alt={service.imageAlt ?? ""}
                      fill
                      sizes="(max-width: 360px) 80px, (max-width: 560px) 104px, 220px"
                      style={{ objectFit: service.imageFit ?? "contain", objectPosition: service.imagePosition ?? "center" }}
                    />
                    <span className={styles.arrow} aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M7 17 17 7M7 7h10v10" />
                      </svg>
                    </span>
                  </div>
                )}
                <div className={styles.copy}>
                  <h2>{service.title}</h2>
                  <p>{service.description}</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
