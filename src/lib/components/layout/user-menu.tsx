/**
 * User Menu — Plan 5 (toned + translucent, native side; mirrors the UI menu).
 *
 * D14-revised account panel: centered email, large display-only avatar,
 * "Hi, <first name>!", a grouped card (platform items + app items + a
 * Light·Dark·System segmented theme control), ghost Sign out. Glassy
 * transparency (`bg-popover/80 backdrop-blur-xl`) for continuity with the app
 * drawer. App-specific items still come from `appItems`.
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  LogOut,
  Settings,
  Shield,
  LayoutDashboard,
  Clock,
  Bell,
  StickyNote,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import type { PlatformMenuItem } from "../../types";

interface AppMenuItem {
  label: string;
  icon: string;
  href: string;
}

interface UserMenuProps {
  username: string;
  email: string;
  isAdmin: boolean;
  /** Absolute avatar image URL; falls back to initials when absent. */
  avatarUrl?: string | null;
  uiBaseUrl?: string;
  platformItems?: PlatformMenuItem[];
  appItems?: AppMenuItem[];
}

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Clock,
  Bell,
  Settings,
  StickyNote,
};

type ThemeMode = "light" | "dark" | "system";

export function UserMenu({
  username,
  email,
  isAdmin,
  avatarUrl,
  uiBaseUrl = "",
  platformItems,
  appItems,
}: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ThemeMode>("system");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    if (html.classList.contains("light")) setMode("light");
    else if (html.classList.contains("dark")) setMode("dark");
    else setMode("system");
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  const applyTheme = useCallback((next: ThemeMode) => {
    setMode(next);
    const html = document.documentElement;
    html.classList.remove("dark", "light");
    if (next === "dark") html.classList.add("dark");
    else if (next === "light") html.classList.add("light");
    else if (window.matchMedia("(prefers-color-scheme: dark)").matches) html.classList.add("dark");
    else html.classList.add("light");
    fetch("/api/theme", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: next }) }).catch(() => {});
  }, []);

  const initials = (username || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const firstName = (username || "").split(" ")[0] || username;

  async function handleLogout() {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      const data = await res.json();
      window.location.href = data.redirect || "/api/auth/sso";
    } catch {
      window.location.href = "/api/auth/sso";
    }
  }

  const resolvedPlatformItems = platformItems
    ?.filter((item) => item.key !== "dashboard" && item.key !== "notifications")
    .map((item) => ({ ...item, url: item.url.startsWith("/") ? `${uiBaseUrl}${item.url}` : item.url }));

  const THEMES: { m: ThemeMode; Icon: React.ElementType }[] = [
    { m: "light", Icon: Sun },
    { m: "dark", Icon: Moon },
    { m: "system", Icon: Monitor },
  ];

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Account menu"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md outline-none transition-colors hover:bg-accent"
      >
        <span className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={username} className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[340px] overflow-hidden rounded-3xl border border-border/60 bg-popover/80 shadow-xl backdrop-blur-xl">
          {/* Email */}
          <p className="truncate px-6 pt-4 pb-3 text-center text-xs text-muted-foreground">{email}</p>

          {/* Avatar + greeting */}
          <div className="flex flex-col items-center gap-2 px-5">
            <span className="flex size-[76px] items-center justify-center overflow-hidden rounded-full bg-muted text-xl font-semibold">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={username} className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </span>
            <div className="flex items-center gap-1.5 text-base font-medium">
              <span>Hi, {firstName}!</span>
              {isAdmin && <Shield className="size-3.5 text-primary" />}
            </div>
          </div>

          {/* Grouped card */}
          <div className="m-3 overflow-hidden rounded-2xl border border-border/50 bg-card/60">
            {resolvedPlatformItems?.map((item) => {
              const Icon = iconMap[item.icon] || Settings;
              return (
                <a key={item.key} href={item.url} className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-accent">
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
            {/* Theme segmented */}
            <div className="flex items-center justify-between gap-3 border-t px-4 py-2.5">
              <span className="flex items-center gap-3 text-sm">
                <Sun className="size-4 text-muted-foreground" />
                Theme
              </span>
              <div className="inline-flex rounded-lg border bg-background p-0.5">
                {THEMES.map(({ m, Icon }) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => applyTheme(m)}
                    aria-pressed={mode === m}
                    className={`grid size-7 place-items-center rounded-md transition-colors ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Icon className="size-3.5" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sign out */}
          <div className="px-3 pb-3">
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
