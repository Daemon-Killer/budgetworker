import { interviewApi, interviewJson, requireFamily } from "@/lib/interview-http";
import { listFamilyInterviews, requestInterview } from "@/lib/interviews";
export const runtime = "nodejs";
export async function GET(req: Request) { return interviewApi(req, async () => listFamilyInterviews((await requireFamily(req)).id)); }
export async function POST(req: Request) { return interviewApi(req, async () => requestInterview(await requireFamily(req), await interviewJson(req))); }
export async function OPTIONS(req: Request) { return interviewApi(req, async () => ({})); }
