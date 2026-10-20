import { getRequestConfig } from "next-intl/server";
import { resolveAppLocale } from "../lib/locale";

// Root layout supplies the locale from its authenticated header response.
export default getRequestConfig(async ({ requestLocale }) => ({
  locale: resolveAppLocale(await requestLocale),
  messages: {},
}));
