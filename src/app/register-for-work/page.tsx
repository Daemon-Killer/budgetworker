import Link from "next/link";
import { WorkerForm } from "@/components/home/WorkerForm";

export const metadata = { title: "Register for Work | BudgetWorker" };
export default function Page() {
  return <div className="mx-auto max-w-3xl space-y-5">
    <Link href="/#work-with-us" className="text-sm font-semibold text-blue-700">← Home / होम</Link>
    <h1 className="hh-section-title">Register for Work / <span lang="hi">काम के लिए पंजीकरण</span></h1>
    <WorkerForm kind="REGISTER" />
  </div>;
}
