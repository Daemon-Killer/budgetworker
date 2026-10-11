import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { bookService } from "@/lib/service-bookings";

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    return jsonOk(await bookService(user.id, body));
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({ error: "Invalid booking details" }, { status: 400 });
    return jsonError(error);
  }
}
