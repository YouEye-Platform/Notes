/** Validate the authenticated header locale against this app's catalogues. */
import languages from "../i18n/languages.json";
export type AppLocale = string;
export function resolveAppLocale(value: unknown): AppLocale {
  if (typeof value !== "string") return "en";
  const code = value.toLowerCase();
  return languages.find(language => language.code.toLowerCase() === code)?.code
    || languages.find(language => language.code.toLowerCase() === code.split("-")[0])?.code || "en";
}
export function localeDirection(locale: string): "ltr" | "rtl" {
  return languages.find(language => language.code === locale)?.direction === "rtl" ? "rtl" : "ltr";
}
