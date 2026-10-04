"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function MobileStickyCta() {
  const path = usePathname();
  if (path.startsWith("/admin")) return null;
  return (
    <nav className="bw-mobile-nav" aria-label="Mobile navigation">
      {[
        ["/", "Home"],
        ["/workers", "Find help"],
        ["/packs", "Plans"],
        ["/account", "Account"],
      ].map(([href, label]) => (
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
