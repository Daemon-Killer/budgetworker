import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();
    const packs = await prisma.pack.findMany({ orderBy: { sortOrder: "asc" } });
    return jsonOk({ packs });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const priceInr = Number(body.priceInr);
    const credits = Number(body.credits);
    const sortOrder = Number(body.sortOrder ?? 0);

    if (!name || !Number.isFinite(priceInr) || priceInr < 1) {
      return jsonError(Object.assign(new Error("Valid name and price required"), { status: 400 }));
    }
    if (!Number.isFinite(credits) || credits < 1) {
      return jsonError(Object.assign(new Error("Credits must be >= 1"), { status: 400 }));
    }

    const pack = await prisma.pack.create({
      data: {
        name,
        priceInr: Math.trunc(priceInr),
        credits: Math.trunc(credits),
        sortOrder: Number.isFinite(sortOrder) ? Math.trunc(sortOrder) : 0,
        active: true,
      },
    });

    return jsonOk({ pack }, { status: 201 });
  } catch (e) {
    return jsonError(e);
  }
}
