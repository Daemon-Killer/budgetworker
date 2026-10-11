import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function review(form: FormData) {
  "use server";
  const admin = await requireAdminPage("/admin/saathi");
  const id = String(form.get("id") || "");
  const type = String(form.get("type") || "");
  const status = String(form.get("status") || "");
  if (type === "document" && ["APPROVED", "REJECTED"].includes(status)) {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.workerDocument.update({
        where: { id, updatedAt: new Date(String(form.get("version"))) },
        data: { status },
        select: { workerId: true, kind: true },
      });
      if (["AADHAAR", "POLICE"].includes(doc.kind))
        await tx.worker.update({
          where: { id: doc.workerId },
          data:
            doc.kind === "AADHAAR"
              ? { aadhaarVerified: status === "APPROVED" }
              : { policeVerified: status === "APPROVED" },
        });
      await tx.auditEntry.create({
        data: {
          actorId: admin.id,
          action: "REVIEW_WORKER_DOCUMENT",
          targetId: id,
          details: JSON.stringify({ status }),
        },
      });
    });
  } else if (type === "support" && ["OPEN", "RESOLVED"].includes(status)) {
    await prisma.$transaction(async (tx) => {
      await tx.workerSupportRequest.update({ where: { id }, data: { status } });
      await tx.auditEntry.create({
        data: {
          actorId: admin.id,
          action: "REVIEW_WORKER_SUPPORT",
          targetId: id,
          details: JSON.stringify({ status }),
        },
      });
    });
  } else throw new Error("Invalid review action");
  revalidatePath("/admin/saathi");
}
export default async function SaathiAdmin() {
  await requireAdminPage("/admin/saathi");
  const [documents, requests] = await Promise.all([
    prisma.workerDocument.findMany({
      where: { status: "PENDING" },
      orderBy: { updatedAt: "asc" },
      take: 100,
      select: {
        id: true,
        kind: true,
        status: true,
        updatedAt: true,
        worker: { select: { name: true, phone: true } },
      },
    }),
    prisma.workerSupportRequest.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "asc" },
      take: 100,
      include: { worker: { select: { name: true, phone: true } } },
    }),
  ]);
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">BudgetWorker Saathi</h1>
        <p className="text-sm text-slate-600">
          Private document review and worker support queue. Oldest pending items
          first, up to 100 per queue.
        </p>
      </header>
      <h2 className="text-lg font-semibold">Documents awaiting review</h2>
      {!documents.length && <p>No pending documents.</p>}
      {documents.map((d) => (
        <article
          key={d.id}
          className="space-y-3 rounded-xl border bg-white p-5"
        >
          <h3 className="font-semibold">
            {d.worker.name} · {d.kind}
          </h3>
          <p>{d.worker.phone}</p>
          <a
            className="text-blue-700 underline"
            href={`/api/worker-account/documents?id=${d.id}`}
          >
            Download private document
          </a>
          <p className="text-xs text-slate-500">
            Review the document before approving. Aadhaar / police approval
            updates the corresponding verification badge.
          </p>
          <form action={review} className="flex gap-3">
            <input type="hidden" name="id" value={d.id} />
            <input type="hidden" name="type" value="document" />
            <input
              type="hidden"
              name="version"
              value={d.updatedAt.toISOString()}
            />
            <button
              className="rounded bg-emerald-700 px-4 py-2 text-white"
              name="status"
              value="APPROVED"
            >
              Approve
            </button>
            <button
              className="rounded border px-4 py-2"
              name="status"
              value="REJECTED"
            >
              Request replacement
            </button>
          </form>
        </article>
      ))}
      <h2 className="text-lg font-semibold">Open worker requests</h2>
      {!requests.length && <p>No open requests.</p>}
      {requests.map((r) => (
        <article
          key={r.id}
          className="space-y-3 rounded-xl border bg-white p-5"
        >
          <h3 className="font-semibold">
            {r.worker.name} · {r.topic}
          </h3>
          <a href={`tel:+91${r.worker.phone}`} className="text-blue-700">
            +91 {r.worker.phone}
          </a>
          <p className="whitespace-pre-wrap">{r.message}</p>
          <p className="text-xs text-slate-500">
            Reference: {r.id} ·{" "}
            {r.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}{" "}
            IST
          </p>
          <form action={review}>
            <input type="hidden" name="id" value={r.id} />
            <input type="hidden" name="type" value="support" />
            <button
              className="rounded bg-emerald-700 px-4 py-2 text-white"
              name="status"
              value="RESOLVED"
            >
              Mark resolved
            </button>
          </form>
        </article>
      ))}
    </div>
  );
}
