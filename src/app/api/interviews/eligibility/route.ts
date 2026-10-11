import { interviewApi, requireFamily } from "@/lib/interview-http";
import { interviewEligibility } from "@/lib/interviews";
export async function GET(req: Request) { return interviewApi(req, async () => interviewEligibility((await requireFamily(req)).id, new URL(req.url).searchParams.get("workerId") || "")); }
export async function OPTIONS(req: Request) { return interviewApi(req, async () => ({})); }
