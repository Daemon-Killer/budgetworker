import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { MobileStickyCta } from "@/components/MobileStickyCta";
import { APP_NAME, SITE_DOMAIN, SITE_URL } from "@/lib/constants";
import Link from "next/link";
import { Brand } from "@/components/Brand";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${APP_NAME} — Find home help | ${SITE_DOMAIN}`,
  description:
    "Browse local home help by location, skills, daily hours and budget. Unlock full resumes with a resume pack.",
  metadataBase: new URL(SITE_URL),
  icons: {
    icon: { url: "/images/brand/budgetworker-logo.png", type: "image/png" },
    apple: "/images/brand/budgetworker-logo.png",
  },
  openGraph: {
    title: `${APP_NAME} — Cheap way to find home help`,
    description:
      "Free directory. Pay only for resumes. Hire directly. budgetworker.in",
    url: SITE_URL,
    siteName: APP_NAME,
    locale: "en_IN",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="hh-page-wash flex min-h-full flex-col text-slate-900">
        <Nav />
        <main className="hh-main-pad mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-10">
          {children}
        </main>
        <footer className="mt-auto border-t border-slate-200/80 bg-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-3">
            <div>
              <Brand />
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Find local home help. Browse profiles for free, unlock resumes and hire directly.
              </p>
            </div>
            <div>
              <p className="hh-section-label">Explore</p>
              <ul className="mt-3 space-y-2.5 text-sm font-medium text-slate-700">
                <li>
                  <Link href="/workers" className="hover:text-blue-700">
                    Free directory
                  </Link>
                </li>
                <li>
                  <Link href="/packs" className="hover:text-blue-700">
                    Resume packs
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-blue-700">
                    Log in
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="hh-section-label !text-blue-600">Why families use us</p>
              <ul className="mt-3 space-y-2.5 text-sm text-slate-600">
                <li>Browse free — no paywall on the list</li>
                <li>From ~₹199 for resume unlock packs</li>
                <li>You hire &amp; pay the worker directly</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} {APP_NAME} · {SITE_DOMAIN} · Home-help marketplace —
            not the employer of listed workers.
          </div>
        </footer>
        <MobileStickyCta />
      </body>
    </html>
  );
}
