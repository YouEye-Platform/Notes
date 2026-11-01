import { createTranslator } from "next-intl";
import { createApiClient } from "@/lib/api";
import { resolveAppLocale } from "@/lib/locale";
import english from "../../messages/en.json";

/** Only pass an authenticated acting user or an authorized notification recipient. */
export async function getActivityTranslator(userId: string) {
  const header = await createApiClient("ye-notes").fetchHeaderConfig(userId);
  const locale = resolveAppLocale(header?.locale);
  const selected = (await import(`../../messages/${locale}.json`)).default;
  const messages: Record<string, string> = { ...english.interface, ...selected.interface };
  return { locale, t: createTranslator({ locale, messages: { interface: messages }, namespace: "interface" }) };
}
