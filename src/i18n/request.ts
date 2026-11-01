import { getRequestConfig } from "next-intl/server";
import { resolveAppLocale } from "../lib/locale";
import { getAppLocale } from "./runtime";
import english from "../../messages/en.json";

function merge(base: Record<string, unknown>, selected: Record<string, unknown>): Record<string, unknown> {
  const result = { ...base };
  for (const [key, value] of Object.entries(selected)) {
    const previous = result[key];
    result[key] = value && typeof value === "object" && !Array.isArray(value)
      && previous && typeof previous === "object" && !Array.isArray(previous)
      ? merge(previous as Record<string, unknown>, value as Record<string, unknown>) : value;
  }
  return result;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = requested ? resolveAppLocale(requested) : await getAppLocale();
  const selected = (await import(`../../messages/${locale}.json`)).default;
  return { locale, messages: merge(english, selected) };
});
