"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./MobileStickyCta.module.css";
import { ServicesMenu } from "./ServicesMenu";
export function MobileStickyCta() {
  const path = usePathname();
  if (path.startsWith("/admin")) return null;
  return (
    <nav className={`bw-mobile-nav ${styles.navigation}`} aria-label="Mobile navigation">
      {[
        ["/", "Home"],
        ["/services", "Services"],
        ["/subscription-price", "Subscription Price"],
        ["/packs", "Resume+ Interview Booking Plans"],
        ["/account", "Account"],
      ].map(([href, label]) => href === "/services" ? (
        <ServicesMenu key={href} variant="mobile" />
      ) : (
        <Link
          key={href}
          href={href}
          aria-current={path === href ? "page" : undefined}
          className={path === href ? "active" : ""}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
