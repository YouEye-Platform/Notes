/** Locale from the authorized platform header; no browser cookie or global user cache. */
const supportedLocales = ["en", "ru", "es", "de", "fr"] as const;
export type AppLocale = (typeof supportedLocales)[number];

export function resolveAppLocale(value: unknown): AppLocale {
  return typeof value === "string" && supportedLocales.includes(value as AppLocale)
    ? value as AppLocale : "en";
}
