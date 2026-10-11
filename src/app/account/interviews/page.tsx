import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { InterviewList } from "@/components/interviews/InterviewList";

export const dynamic = "force-dynamic";
export default async function Page() {
  if (!(await getSession())) redirect("/login?next=%2Faccount%2Finterviews");
  return <InterviewList />;
}
