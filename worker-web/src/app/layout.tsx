import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "BudgetWorker • For workers", description: "Your profile, availability and interview invitations in one place.", robots: { index: false, follow: false } };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
