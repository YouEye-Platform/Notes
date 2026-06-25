/**
 * AppHeader — the universal YouEye header, identical across the UI, Settings,
 * and every native app. The ONLY thing that differs per app is the top-left
 * logo/wordart (Plan 4 D-H1), and that difference is data-driven, not code:
 * branding arrives via `HeaderConfig.navigation.self`.
 *
 * Server component. Fetches session + header config, then renders:
 *   [ logo/wordart ] [ app's center slot ] [ Home · Drawer · Bell · Account ]
 *
 * Usage:
 *   import { AppHeader } from "@/lib/components/layout";
 *
 *   <AppHeader
 *     appId="ye-cinema"
 *     appName="Cinema"
 *     appIcon={<Film className="h-5 w-5" />}
 *     navItems={[{ label: "Discover", href: "/" }, { label: "Search", href: "/search" }]}
 *     appMenuItems={[{ label: "Cinema Preferences", icon: "Film", href: "/settings" }]}
 *   >
 *     {/* optional app-specific center content, e.g. a search box *_/}
 *   </AppHeader>
 */

import { getSession } from "../../auth/session";
import { createApiClient } from "../../api";
import { AppDrawer } from "./app-drawer";
import { NotificationBell } from "./notification-bell";
import { UserMenu } from "./user-menu";
import { HomeButton } from "./home-button";
import { BrandedAppTitle } from "./branded-app-title";
import { MobileAccountSheet } from "./mobile-account-sheet";
import type { PlatformMenuItem, SelfBranding } from "../../types";
import * as LucideIcons from "lucide-react";

function kebabToPascal(s: string): string {
  return s.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
}

interface NavItem {
  label: string;
  href: string;
}

interface AppMenuItem {
  label: string;
  icon: string;
  href: string;
}

interface AppHeaderProps {
  /** App ID for API calls, e.g. "ye-cinema" */
  appId: string;
  /** Display name, e.g. "Cinema" (fallback when no custom branding) */
  appName: string;
  /** Icon element rendered next to the app name (fallback when no custom icon) */
  appIcon: React.ReactNode;
  /** Navigation items shown in the centered slot (desktop only) */
  navItems?: NavItem[];
  /** App-specific items in the account menu dropdown */
  appMenuItems?: AppMenuItem[];
  /** Optional app-specific controls rendered in the centered header slot */
  children?: React.ReactNode;
}

export async function AppHeader({
  appId,
  appName,
  appIcon,
  navItems,
  appMenuItems,
  children,
}: AppHeaderProps) {
  const session = await getSession();
  if (!session) return null;

  const api = createApiClient(appId);
  const headerConfig = await api.fetchHeaderConfig(session.userId);

  const user = headerConfig?.user ?? {
    id: session.userId,
    name: session.name ?? session.username,
    username: session.username,
    email: session.email,
    is_admin: session.isAdmin,
  };

  const unreadCount = headerConfig?.notifications?.unread_count ?? 0;
  const uiBaseUrl = headerConfig?.ui_base_url ?? "";
  const platformItems: PlatformMenuItem[] | undefined = headerConfig?.user_menu?.platform_items;
  const appSettingsUrl: string | undefined = headerConfig?.user_menu?.app_settings_url;

  // Merge caller-supplied app menu items with the platform-provided "App Settings" link
  const mergedAppItems = [
    ...(appMenuItems ?? []),
    ...(appSettingsUrl ? [{ label: "App Settings", icon: "Sliders", href: appSettingsUrl }] : []),
  ];

  // Per-app branding (Plan 4 Phase 0). The full app list is stripped from
  // service calls (E1 security fix); each native app receives ONLY its own
  // branding via `navigation.self`, which is what restores the logo/wordart.
  const self: SelfBranding | null = headerConfig?.navigation?.self ?? null;
  const displayMode = self?.header_display_mode ?? "logo-text";
  const brandingCss = self?.branding_css
    ? (self.branding_css as unknown as React.CSSProperties)
    : undefined;
  const brandingFontUrl = self?.branding_font_url ?? null;
  const brandingCssChars = self?.branding_css_chars ?? null;

  const displayName = self?.custom_name ?? appName;
  const customIcon = self?.custom_icon_url ?? null;

  // Render custom icon or fall back to the prop
  let renderedIcon: React.ReactNode = appIcon;
  if (customIcon) {
    if (customIcon.startsWith("emoji:")) {
      renderedIcon = <span className="text-lg leading-none">{customIcon.replace("emoji:", "")}</span>;
    } else if (customIcon.startsWith("/") || customIcon.startsWith("http") || customIcon.startsWith("data:")) {
      // eslint-disable-next-line @next/next/no-img-element
      renderedIcon = <img src={customIcon} alt="" className="h-5 w-5 rounded object-cover" />;
    } else {
      const IconComp = (LucideIcons as Record<string, unknown>)[kebabToPascal(customIcon)];
      if (IconComp != null) {
        const LucideIcon = IconComp as React.ComponentType<{ className?: string }>;
        renderedIcon = <LucideIcon className="h-5 w-5" />;
      }
    }
  }

  const resolvedFontUrl = brandingFontUrl
    ? brandingFontUrl.startsWith("http")
      ? brandingFontUrl
      : `${uiBaseUrl}${brandingFontUrl}`
    : null;

  const centerContent = children ?? (
    navItems && navItems.length > 0 ? (
      <nav className="hidden md:flex items-center justify-center gap-1">
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="px-3 py-1.5 text-sm rounded-md hover:bg-accent/50 transition-colors text-muted-foreground"
          >
            {item.label}
          </a>
        ))}
      </nav>
    ) : null);

  const mobileNavItems = navItems && navItems.length > 0 ? navItems : [{ label: displayName, href: "/" }];

  return (
    <>
      <header className="ye-mobile-top-header sticky top-0 z-50 grid h-14 grid-cols-[minmax(0,1fr)_minmax(0,640px)_minmax(0,1fr)] items-center gap-3 border-b border-border/40 bg-background/95 px-4 backdrop-blur-md">
        <a
          href="/"
          className="flex min-w-0 items-center justify-start gap-2 font-semibold text-foreground hover:text-foreground/80 transition-colors"
          title={displayName}
        >
          {displayMode !== "text-only" && renderedIcon}
          {displayMode !== "icon-only" &&
            (brandingCss ? (
              <BrandedAppTitle
                name={displayName}
                css={brandingCss}
                fontUrl={resolvedFontUrl}
                charTransforms={brandingCssChars}
              />
            ) : (
              <span>{displayName}</span>
            ))}
        </a>

        <div className="ye-mobile-top-center flex min-w-0 items-center justify-center">{centerContent}</div>

        <div className="ye-mobile-top-actions flex min-w-0 items-center justify-end gap-1">
          <HomeButton uiBaseUrl={uiBaseUrl} />
          <AppDrawer uiBaseUrl={uiBaseUrl} />
          <NotificationBell initialCount={unreadCount} uiBaseUrl={uiBaseUrl} />
          <UserMenu
            username={user.username ?? user.name ?? ""}
            email={user.email ?? ""}
            isAdmin={user.is_admin ?? false}
            avatarUrl={headerConfig?.user?.avatar_url}
            uiBaseUrl={uiBaseUrl}
            platformItems={platformItems}
            appItems={mergedAppItems}
          />
        </div>
      </header>

      <div className="ye-mobile-shell-only fixed inset-x-0 bottom-0 z-50 items-center gap-2 border-t border-border/60 bg-background/95 px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-xl">
        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {mobileNavItems.map((item) => (
            <a
              key={`${item.href}-${item.label}`}
              href={item.href}
              className="inline-flex h-12 min-w-12 items-center justify-center rounded-2xl px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <MobileAccountSheet
          username={user.username ?? user.name ?? ""}
          email={user.email ?? ""}
          isAdmin={user.is_admin ?? false}
          avatarUrl={headerConfig?.user?.avatar_url}
          initialCount={unreadCount}
          uiBaseUrl={uiBaseUrl}
          platformItems={platformItems}
          appItems={mergedAppItems}
        />
      </div>
      <div className="ye-mobile-shell-spacer" aria-hidden="true" />
    </>
  );
}
