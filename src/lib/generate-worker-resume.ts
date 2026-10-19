import "regenerator-runtime/runtime";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fonts from "./resume-fonts.json";
import { LABELS } from "../../shared/marketplace";
import { employmentLabel } from "./constants";
import type { Worker } from "@prisma/client";

// Contact information belongs in the private admin record, never the resume.
function clean(value: string) {
  return value.replace(/https?:\/\/\S+|www\.\S+|[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, "[contact removed]")
    .replace(/(?:\+?\d[\s().-]*){10,}/g, "[contact removed]")
    .replace(/[\u0000-\u001f]/g, " ").trim();
}

export async function generateWorkerResume(w: Worker, photo?: { data: Uint8Array; mimeType: string } | null) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const latin = await pdf.embedFont(Buffer.from(fonts.latin, "base64"), { subset: true });
  const devanagari = await pdf.embedFont(Buffer.from(fonts.devanagari, "base64"), { subset: true });
  const ink = rgb(.12, .18, .28), muted = rgb(.38, .44, .52), blue = rgb(.12, .29, .55);
  let page: PDFPage, y: number;
  function newPage() {
    page = pdf.addPage([595.28, 841.89]); y = 785;
    page.drawText("BUDGET WORKER  /  WORKER PROFILE", { x: 42, y: 810, size: 9, font: latin, color: blue });
  }
  function fontFor(text: string): PDFFont { return /[\u0900-\u097f]/.test(text) ? devanagari : latin; }
  function runs(text: string) { return text.match(/[\u0900-\u097f\u200c\u200d]+|[^\u0900-\u097f\u200c\u200d]+/g) || []; }
  function width(text: string, size: number) { return runs(text).reduce((sum, run) => sum + fontFor(run).widthOfTextAtSize(run, size), 0); }
  function draw(text: string, size = 11, color = ink, maxWidth = 510) {
    const safe = clean(text);
    let line = "";
    function flush() {
      if (y < 65) newPage();
      let x = 42;
      for (const run of runs(line)) { const font = fontFor(run); page.drawText(run, { x, y, size, font, color }); x += font.widthOfTextAtSize(run, size); }
      y -= size * 1.55; line = "";
    }
    for (const word of safe.split(/\s+/)) {
      // Break very long tokens so arbitrary profile text cannot overflow the page.
      for (const char of (line ? " " : "") + word) {
        if (width(line + char, size) > maxWidth) flush();
        line += char;
      }
    }
    if (line) flush();
  }
  function section(title: string) { if (y < 120) newPage(); y -= 14; draw(title.toUpperCase(), 10, blue); page.drawLine({ start: { x: 42, y: y + 3 }, end: { x: 553, y: y + 3 }, color: rgb(.86, .89, .93), thickness: .7 }); y -= 9; }
  newPage();
  let image;
  if (photo) { try { image = photo.mimeType === "image/png" ? await pdf.embedPng(photo.data) : await pdf.embedJpg(photo.data); } catch { /* A malformed photo must not prevent a text resume. */ } }
  if (image) { const scaled = image.scaleToFit(90, 100); page!.drawImage(image, { x: 553 - scaled.width, y: 674, width: scaled.width, height: scaled.height }); }
  draw(w.name, 25, ink, image ? 390 : 510);
  draw([w.category, w.secondaryCategory].filter(Boolean).map((c) => LABELS[c!] || c).join(" | "), 12, blue, image ? 390 : 510);
  draw([w.area, w.city].filter(Boolean).join(", "), 11, muted, image ? 390 : 510);
  if (image) y = Math.min(y!, 655);
  section("Professional profile");
  const rows = [
    ["Work arrangement", employmentLabel(w.employmentType)],
    ["Total experience", w.experienceYears == null ? null : w.experienceYears >= 10 ? "10+ years" : w.experienceYears === 0 ? "0-1 years" : `${w.experienceYears} years`],
    ["Qualification", w.qualification], ["English level", w.englishLanguage],
    ["Preferred language", w.preferredLanguage], ["Can join", w.whenCanJoin],
    ["Preferred work area", w.workingLocation], ["Food preferences", w.vegNonVeg],
  ];
  for (const [label, value] of rows) if (value) draw(`${label}: ${value}`);
  const experienceCategories = w.experienceCategories
    ? w.experienceCategories.split(",").filter(Boolean)
    : [w.category, w.secondaryCategory].filter((value): value is string => Boolean(value));
  if (w.experienceYears != null && experienceCategories.length) {
    section("Experience by type of help");
    const years = w.experienceYears >= 10 ? "10+ years" : w.experienceYears === 0 ? "0-1 years" : `${w.experienceYears} years`;
    for (const category of experienceCategories) draw(`${LABELS[category] || category}: ${years}`);
    draw("Experience overlaps across these services; it is not added to the total.", 9, muted);
  }
  if (w.skill) { section("Skills"); draw(w.skill); }
  if (w.about) { section("About the worker"); draw(w.about); }
  section("Verification");
  draw(`Aadhaar: ${w.aadhaarVerified ? "Verified" : "Not verified"}   |   Police: ${w.policeVerified ? "Verified" : "Not verified"}`);
  for (const [i, p] of pdf.getPages().entries()) {
    p.drawText(`budgetworker.in  |  Arrange interviews through Budget Worker`, { x: 42, y: 32, font: latin, size: 8, color: muted });
    p.drawText(`${i + 1} / ${pdf.getPageCount()}`, { x: 520, y: 32, font: latin, size: 8, color: muted });
  }
  pdf.setTitle("Budget Worker - Worker Resume"); pdf.setAuthor("Budget Worker");
  return Buffer.from(await pdf.save());
}
