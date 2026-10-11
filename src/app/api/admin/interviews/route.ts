import { requireAdmin } from "@/lib/auth";
import { interviewApi } from "@/lib/interview-http";
import { listAdminInterviews } from "@/lib/interviews";
export async function GET(req: Request) { return interviewApi(req, async () => { await requireAdmin(req); return listAdminInterviews(); }); }
export async function OPTIONS(req: Request) { return interviewApi(req, async () => ({})); }
