"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ElementType } from "react";
import {
  Bell,
  ChevronDown,
  Clock,
  Home,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Monitor,
  Moon,
  Settings,
  Shield,
  Sliders,
  StickyNote,
  Sun,
  X,
} from "lucide-react";
import type { PlatformMenuItem } from "../../types";

interface AppMenuItem {
  label: string;
  icon: string;
  href: string;
}

interface MobileAccountSheetProps {
  username: string;
  email: string;
  isAdmin: boolean;
  avatarUrl?: string | null;
  initialCount: number;
  uiBaseUrl?: string;
  platformItems?: PlatformMenuItem[];
  appItems?: AppMenuItem[];
}

type SheetSection = "notifications" | "drawer" | "launcher" | null;
type ThemeMode = "light" | "dark" | "system";

const iconMap: Record<string, ElementType> = {
  LayoutDashboard,
  Clock,
  Bell,
  Settings,
  Sliders,
  StickyNote,
};

function initials(name: string) {
  return (
    (name || "?")
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "YE"
  );
}

function resolveMode(): "light" | "dark" {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function SectionButton({
  section,
  activeSection,
  label,
  Icon,
  onOpen,
}: {
  section: Exclude<SheetSection, null>;
  activeSection: SheetSection;
  label: string;
  Icon: typeof Bell;
  onOpen: (section: SheetSection) => void;
}) {
  const open = activeSection === section;
  return (
    <button
      type="button"
      onClick={() => onOpen(open ? null : section)}
      className="flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-accent"
      aria-expanded={open}
    >
      <Icon className="size-4 text-muted-foreground" />
      <span className="flex-1 text-left">{label}</span>
      <ChevronDown className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
  );
}

export function MobileAccountSheet({
  username,
  email,
  isAdmin,
  avatarUrl,
  initialCount,
  uiBaseUrl = "",
  platformItems,
  appItems,
}: MobileAccountSheetProps) {
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<SheetSection>(null);
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [count, setCount] = useState(initialCount);

  const base = uiBaseUrl ? uiBaseUrl.replace(/\/$/, "") : "";
  const origin = useMemo(() => {
    if (!base) return "";
    try {
      return new URL(base).origin;
    } catch {
      return base;
    }
  }, [base]);

  useEffect(() => setCount(initialCount), [initialCount]);

  useEffect(() => {
    const html = document.documentElement;
    if (html.classList.contains("light")) setThemeMode("light");
    else if (html.classList.contains("dark")) setThemeMode("dark");
    else setThemeMode("system");
  }, []);

  useEffect(() => {
    if (!open) return;
    setMode(resolveMode());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (origin && event.origin !== origin) return;
      if (event.data?.type === "youeye:notifications" && typeof event.data.unread_count === "number") {
        setCount(event.data.unread_count);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [origin]);

  const applyTheme = useCallback((next: ThemeMode) => {
    setThemeMode(next);
    const html = document.documentElement;
    html.classList.remove("dark", "light");
    if (next === "dark") html.classList.add("dark");
    else if (next === "light") html.classList.add("light");
    else if (window.matchMedia("(prefers-color-scheme: dark)").matches) html.classList.add("dark");
    else html.classList.add("light");
    fetch("/api/theme", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: next }),
    }).catch(() => {});
  }, []);

  async function handleLogout() {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      const data = await res.json();
      window.location.href = data.redirect || "/api/auth/sso";
    } catch {
      window.location.href = "/api/auth/sso";
    }
  }

  const firstName = (username || "").split(" ")[0] || username;
  const fallback = initials(username);
  const resolvedPlatformItems = platformItems
    ?.filter((item) => item.key !== "dashboard" && item.key !== "notifications")
    .map((item) => ({ ...item, url: item.url.startsWith("/") ? `${base}${item.url}` : item.url }));

  const embedSrc = (kind: "notifications" | "drawer" | "launcher") => {
    if (!base) return "";
    const params = new URLSearchParams({ mode, surface: "sheet" });
    if (kind === "drawer" && isAdmin) params.set("admin", "true");
    return `${base}/embed/${kind}?${params.toString()}`;
  };

  const themes: { m: ThemeMode; Icon: ElementType; label: string }[] = [
    { m: "light", Icon: Sun, label: "Light" },
    { m: "dark", Icon: Moon, label: "Dark" },
    { m: "system", Icon: Monitor, label: "Auto" },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Account menu"
        className="relative inline-flex size-12 items-center justify-center rounded-2xl transition-colors hover:bg-accent"
      >
        <span className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={username} className="h-full w-full object-cover" />
          ) : (
            fallback
          )}
        </span>
        {count > 0 && (
          <span className="absolute right-1 top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] text-foreground">
          <button
            type="button"
            aria-label="Close account sheet"
            className="absolute inset-0 bg-background/45 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-3xl border border-border/60 bg-popover/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-2xl backdrop-blur-xl">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Account</span>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="rounded-2xl border border-border/50 bg-card/60">
              <p className="truncate px-6 pb-3 pt-4 text-center text-xs text-muted-foreground">{email}</p>
              <div className="flex flex-col items-center gap-2 px-5 pb-4">
                <span className="flex size-[76px] items-center justify-center overflow-hidden rounded-full bg-muted text-xl font-semibold">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt={username} className="h-full w-full object-cover" />
                  ) : (
                    fallback
                  )}
                </span>
                <div className="flex items-center gap-1.5 text-base font-medium">
                  <span>Hi, {firstName}!</span>
                  {isAdmin && <Shield className="size-3.5 text-primary" />}
                </div>
              </div>
            </div>

            {base && (
              <div className="mt-3 overflow-hidden rounded-2xl border border-border/50 bg-card/60">
                <SectionButton section="notifications" activeSection={activeSection} label="Notifications" Icon={Bell} onOpen={setActiveSection} />
                {activeSection === "notifications" && (
                  <iframe title="YouEye notifications" src={embedSrc("notifications")} className="h-[380px] w-full border-t bg-transparent" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation" allow="clipboard-read; clipboard-write" />
                )}
                <div className="border-t" />
                <SectionButton section="drawer" activeSection={activeSection} label="App drawer" Icon={LayoutGrid} onOpen={setActiveSection} />
                {activeSection === "drawer" && (
                  <iframe title="YouEye app drawer" src={embedSrc("drawer")} className="h-[380px] w-full border-t bg-transparent" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation" allow="clipboard-read; clipboard-write" />
                )}
                <div className="border-t" />
                <SectionButton section="launcher" activeSection={activeSection} label="Launcher" Icon={LayoutGrid} onOpen={setActiveSection} />
                {activeSection === "launcher" && (
                  <iframe title="YouEye launcher" src={embedSrc("launcher")} className="h-[460px] w-full border-t bg-transparent" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation" allow="clipboard-read; clipboard-write" />
                )}
              </div>
            )}

            <div className="mt-3 overflow-hidden rounded-2xl border border-border/50 bg-card/60">
              {base && (
                <>
                  <a href={base} className="flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-accent">
                    <Home className="size-4 text-muted-foreground" />
                    Home
                  </a>
                  <div className="border-t" />
                </>
              )}
              {resolvedPlatformItems?.map((item) => {
                const Icon = iconMap[item.icon] || Settings;
                return (
                  <a key={item.key} href={item.url} className="flex items-center gap-3 border-t px-4 py-3 text-sm transition-colors first:border-t-0 hover:bg-accent">
                    <Icon className="size-4 text-muted-foreground" />
                    {item.label}
                  </a>
                );
              })}
              {appItems?.map((item) => {
                const Icon = iconMap[item.icon] || Settings;
                return (
                  <a key={item.href} href={item.href} className="flex items-center gap-3 border-t px-4 py-3 text-sm transition-colors hover:bg-accent">
                    <Icon className="size-4 text-muted-foreground" />
                    {item.label}
                  </a>
                );
              })}
              <div className="border-t" />
              <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="flex items-center gap-3 text-sm">
                  <Sun className="size-4 text-muted-foreground" />
                  Theme
                </span>
                <div className="inline-flex rounded-lg border bg-background p-0.5">
                  {themes.map(({ m, Icon, label }) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => applyTheme(m)}
                      aria-pressed={themeMode === m}
                      title={label}
                      className={`grid size-7 place-items-center rounded-md transition-colors ${themeMode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <Icon className="size-3.5" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </>
  );
}
