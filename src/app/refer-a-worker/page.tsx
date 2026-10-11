import Link from "next/link";
import { WorkerForm } from "@/components/home/WorkerForm";

export const metadata = { title: "Refer a Worker | BudgetWorker" };
export default function Page() {
  return <div className="mx-auto max-w-3xl space-y-5">
    <Link href="/#work-with-us" className="text-sm font-semibold text-blue-700">← Home / होम</Link>
    <h1 className="hh-section-title">Refer a Worker / <span lang="hi">कर्मचारी का रेफरेंस दें</span></h1>
    <WorkerForm kind="REFER" />
  </div>;
}
