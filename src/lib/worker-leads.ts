import { prisma } from "./db";
import { CreditError } from "./credits";
import { normalizePhone } from "./phone";
import { workerLeadSchema } from "./worker-lead-input";

export async function submitWorkerLead(body: unknown) {
  const parsed = workerLeadSchema.safeParse(body);
  if (!parsed.success) throw new CreditError(parsed.error.issues[0]?.message ?? "Check your form details", 400);
  const { requestId, kind, ...details } = parsed.data;
  const payload = { ...details, referrerName: kind === "REFER" ? details.referrerName : "", referrerPhone: kind === "REFER" ? normalizePhone(details.referrerPhone) : "", relationship: kind === "REFER" ? details.relationship : "" };
  const existing = await prisma.workerLead.findUnique({ where: { requestId } });
  if (!existing) {
    const recent = await prisma.workerLead.count({ where: { phone: payload.phone, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } } });
    if (recent >= 5) throw new CreditError("Too many submissions for this mobile number. Please try again later.", 429);
  }
  const lead = await prisma.workerLead.upsert({ where: { requestId }, update: {}, create: { requestId, kind, name: payload.name, phone: payload.phone, city: payload.city, area: payload.area, details: payload } });
  const original = lead.details as Record<string, unknown>;
  if (lead.kind !== kind || Object.keys(payload).some(key => JSON.stringify(original[key]) !== JSON.stringify(payload[key as keyof typeof payload]))) throw new CreditError("Form details changed. Please submit a new request.", 409);
  return { reference: lead.id, status: "RECEIVED" };
}
