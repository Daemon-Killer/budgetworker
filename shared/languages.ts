export const PREFERRED_LANGUAGES = ["English", "Hindi", "Marathi", "Punjabi", "Kannada", "Bengali", "Telugu", "Tamil", "Gujarati", "Malayalam", "Odia", "Assamese"] as const;
export function selectedLanguages(value: string) {
  return value.split(",").map((language) => language.trim()).filter(Boolean);
}
