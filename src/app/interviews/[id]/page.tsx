import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { InterviewRoom } from "@/components/interviews/InterviewRoom";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Private interview | Budget Worker", referrer: "no-referrer", robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await getSession())) redirect("/login?next=" + encodeURIComponent("/interviews/" + id));
  return <InterviewRoom id={id} />;
}
