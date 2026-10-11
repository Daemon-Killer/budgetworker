import type { Metadata } from "next";
import { InterviewRoom } from "@/components/interviews/InterviewRoom";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Private worker invitation | Budget Worker", referrer: "no-referrer", robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ token: string }> }) { const { token } = await params; return <InterviewRoom inviteToken={token} />; }
