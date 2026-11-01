import { getTranslations as getInterfaceTranslations } from "next-intl/server";
import { localeDirection } from "@/lib/locale";
import { getAppLocale } from "@/i18n/runtime";
import { LocaleRefresh } from "@/components/locale-refresh";
import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import "./globals.css";
import { getSession } from "@/lib/auth";
import { createApiClient } from "@/lib/api";
import {
  getThemeCSSVariables,
  getThemeMode,
  generateThemeStyle,
  generateSystemThemeScript,
} from "@/lib/theme";
import { AppHeader } from "@/lib/components/layout";
import { InstallBanner } from "@/components/pwa/install-banner";
import { StickyNote } from "lucide-react";
import { LaunchRequirementsBanner } from "@/components/launch-requirements-banner";

export async function generateMetadata(): Promise<Metadata> {
  const translateInterface = await getInterfaceTranslations("interface");
  const appName = process.env.APP_NAME || "Notes";
  return {
    title: appName,
    description: translateInterface("m6b373240d64d"),
    icons: { icon: "/api/pwa/icon?size=32" },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: appName,
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#f59e0b",
  width: "device-width",
  initialScale: 1,
};

const api = createApiClient("ye-notes");

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession().catch(() => null);

  let headerConfig = null;
  let launchRequirements = null;
  if (session) {
    [headerConfig, launchRequirements] = await Promise.all([
      api.fetchHeaderConfig(session.userId),
      api.getLaunchRequirements(session.userId, process.env.NOTES_EXTERNAL_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL),
    ]);
  }

  const cssVariables = getThemeCSSVariables(headerConfig);
  const themeStyle = generateThemeStyle(cssVariables);
  const themeMode = getThemeMode(headerConfig);
  const isSystemTheme = themeMode === "system";
  const htmlClass = isSystemTheme ? "" : themeMode;

  const locale = await getAppLocale();
  const messages = await getMessages({ locale });

  return (
    <html lang={locale} dir={localeDirection(locale)} className={htmlClass} suppressHydrationWarning>
      <head>
        {isSystemTheme && (
          <script dangerouslySetInnerHTML={{ __html: generateSystemThemeScript() }} />
        )}
        {themeStyle && (
          <style
            id="ye-theme"
            dangerouslySetInnerHTML={{ __html: themeStyle }}
          />
        )}
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <LocaleRefresh locale={locale} endpoint="/api/locale" />
          {session && (
            <AppHeader
              appId="ye-notes"
              appName="Notes"
              appIcon={<StickyNote className="h-5 w-5" />}
              appMenuItems={[]}
            />
          )}
          {session && <LaunchRequirementsBanner appName="Notes" requirements={launchRequirements} />}
          <main>{children}</main>
          <InstallBanner appName="Notes" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
