import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "BudgetWorker Saathi",
  description:
    "Better Work. Brighter Tomorrows. Jobs, duties and support for domestic workers.",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hi">
      <body>{children}</body>
    </html>
  );
}
