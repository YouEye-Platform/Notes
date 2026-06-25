/**
 * Notification Bell — native host shell.
 *
 * The native app owns only the trigger button, unread badge, and a sandboxed
 * fullscreen iframe. The YouEye UI /embed/notifications route owns the panel,
 * notification contents, actions, scroll, transparency, and close behavior.
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell } from "lucide-react";

interface NotificationBellProps {
  initialCount: number;
  /** Root UI origin from header config `ui_base_url`. */
  uiBaseUrl?: string;
}

const SANDBOX =
  "allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation";

function resolveMode(): "light" | "dark" {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function NotificationFrame({
  active,
  preload,
  base,
  origin,
  mode,
}: {
  active: boolean;
  preload: boolean;
  base: string;
  origin: string;
  mode: "light" | "dark";
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [mounted, setMounted] = useState(active || preload);
  const [loaded, setLoaded] = useState(false);
  const src = useMemo(() => (base ? `${base}/embed/notifications?mode=${mode}` : null), [base, mode]);
  const targetOrigin = origin || "*";

  useEffect(() => {
    if (active || preload) setMounted(true);
  }, [active, preload]);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  const postVisibility = useCallback(() => {
    if (!src) return;
    iframeRef.current?.contentWindow?.postMessage(
      { type: "youeye:overlay-visibility", kind: "notifications", open: active },
      targetOrigin
    );
  }, [active, src, targetOrigin]);

  useEffect(() => {
    if (!mounted || !loaded) return;
    postVisibility();
  }, [loaded, mounted, postVisibility]);

  if (!mounted || !src) return null;

  return createPortal(
    <iframe
      ref={iframeRef}
      src={src}
      className={`fixed inset-0 z-[60] h-screen w-screen border-0 bg-transparent transition-opacity duration-100 ${
        active && loaded ? "pointer-events-auto" : "pointer-events-none"
      }`}
      style={{ colorScheme: mode, opacity: active && loaded ? 1 : 0 }}
      title="YouEye notifications"
      sandbox={SANDBOX}
      allow="clipboard-read; clipboard-write"
      onLoad={() => {
        setLoaded(true);
        window.setTimeout(postVisibility, 0);
      }}
    />,
    document.body
  );
}

export function NotificationBell({ initialCount, uiBaseUrl }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [prewarm, setPrewarm] = useState(false);
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [count, setCount] = useState(initialCount);
  const [mounted, setMounted] = useState(false);

  const base = uiBaseUrl ? uiBaseUrl.replace(/\/$/, "") : "";
  const origin = useMemo(() => {
    if (!base) return "";
    try {
      return new URL(base).origin;
    } catch {
      return base;
    }
  }, [base]);

  useEffect(() => setMounted(true), []);
  useEffect(() => setCount(initialCount), [initialCount]);

  const warmPanel = useCallback(() => {
    if (!base) return;
    setMode(resolveMode());
    setPrewarm(true);
  }, [base]);

  const openPanel = useCallback(() => {
    if (!open) warmPanel();
    setOpen(!open);
  }, [open, warmPanel]);

  useEffect(() => {
    if (!base || !mounted) return;
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    if (idleWindow.requestIdleCallback) {
      const handle = idleWindow.requestIdleCallback(warmPanel, { timeout: 1200 });
      return () => idleWindow.cancelIdleCallback?.(handle);
    }
    const handle = window.setTimeout(warmPanel, 600);
    return () => window.clearTimeout(handle);
  }, [base, mounted, warmPanel]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (origin && event.origin !== origin) return;
      if (event.data?.type === "youeye:close") {
        setOpen(false);
        return;
      }
      if (event.data?.type === "youeye:notifications" && typeof event.data.unread_count === "number") {
        setCount(event.data.unread_count);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [origin]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        onClick={openPanel}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-accent disabled:opacity-50"
        aria-label="Notifications"
        disabled={!base}
        onFocus={warmPanel}
        onPointerEnter={warmPanel}
      >
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {mounted && (
        <NotificationFrame
          active={open}
          preload={prewarm}
          base={base}
          origin={origin}
          mode={mode}
        />
      )}
    </>
  );
}
