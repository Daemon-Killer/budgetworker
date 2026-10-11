/** Keep internal upload filenames, which may contain phone numbers, private. */
export function publicResumeFileName(mime: string | null, original: string | null) {
  const extensions: Record<string, string> = {
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "image/jpeg": "jpg",
    "image/png": "png",
  };
  const fallback = original?.match(/\.(pdf|doc|docx|jpg|jpeg|png)$/i)?.[1].toLowerCase();
  return "budget-worker-resume." + (extensions[mime ?? ""] ?? fallback ?? "pdf");
}
