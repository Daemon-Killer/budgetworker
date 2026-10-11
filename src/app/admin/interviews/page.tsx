import { requireAdminPage } from "@/lib/admin";
import { AdminInterviews } from "@/components/interviews/AdminInterviews";

export const dynamic = "force-dynamic";
export default async function Page() { await requireAdminPage("/admin/interviews"); return <AdminInterviews />; }
