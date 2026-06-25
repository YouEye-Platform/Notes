/**
 * App Drawer — native host shell.
 *
 * The native app owns only the trigger button and a sandboxed fullscreen iframe.
 * The YouEye UI /embed routes own drawer/launcher chrome, sizing, scroll,
 * transparency, animation, and outside-click close behavior.
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface AppDrawerProps {
  /** Root UI origin (e.g. https://example.com) from header config `ui_base_url`. */
  uiBaseUrl?: string;
}

type OverlayKind = "drawer" | "launcher";

const SANDBOX =
  "allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation";

function DotsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      {[4, 12, 20].map((cy) => [4, 12, 20].map((cx) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2" />))}
    </svg>
  );
}

function resolveMode(): "light" | "dark" {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function OverlayFrame({
  kind,
  active,
  preload,
  base,
  origin,
  mode,
}: {
  kind: OverlayKind;
  active: boolean;
  preload: boolean;
  base: string;
  origin: string;
  mode: "light" | "dark";
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [mounted, setMounted] = useState(active || preload);
  const [loaded, setLoaded] = useState(false);
  const src = useMemo(() => (base ? `${base}/embed/${kind}?mode=${mode}` : null), [base, kind, mode]);
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
      { type: "youeye:overlay-visibility", kind, open: active },
      targetOrigin
    );
  }, [active, kind, src, targetOrigin]);

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
      title={`YouEye ${kind}`}
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

export function AppDrawer({ uiBaseUrl }: AppDrawerProps) {
  const [overlay, setOverlay] = useState<OverlayKind | null>(null);
  const [prewarm, setPrewarm] = useState(false);
  const [mode, setMode] = useState<"light" | "dark">("light");
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

  const warmOverlays = useCallback(() => {
    if (!base) return;
    setMode(resolveMode());
    setPrewarm(true);
  }, [base]);

  const openOverlay = useCallback((kind: OverlayKind) => {
    warmOverlays();
    setOverlay(kind);
  }, [warmOverlays]);

  useEffect(() => {
    if (!base || !mounted) return;
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    if (idleWindow.requestIdleCallback) {
      const handle = idleWindow.requestIdleCallback(warmOverlays, { timeout: 1200 });
      return () => idleWindow.cancelIdleCallback?.(handle);
    }
    const handle = window.setTimeout(warmOverlays, 600);
    return () => window.clearTimeout(handle);
  }, [base, mounted, warmOverlays]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (origin && event.origin !== origin) return;
      if (event.data?.type === "youeye:close") {
        setOverlay(null);
        return;
      }
      if (event.data?.type === "youeye:overlay-command" && event.data?.command === "open-launcher") {
        warmOverlays();
        setOverlay("launcher");
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [origin, warmOverlays]);

  useEffect(() => {
    if (!overlay) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOverlay(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [overlay]);

  return (
    <>
      <button
        className="inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-accent disabled:opacity-50"
        aria-label="Apps"
        disabled={!base}
        onFocus={warmOverlays}
        onClick={() => openOverlay("drawer")}
        onPointerEnter={warmOverlays}
      >
        <DotsIcon className="h-4 w-4" />
      </button>

      {mounted && (
        <>
          <OverlayFrame
            kind="drawer"
            active={overlay === "drawer"}
            preload={prewarm}
            base={base}
            origin={origin}
            mode={mode}
          />
          <OverlayFrame
            kind="launcher"
            active={overlay === "launcher"}
            preload={prewarm}
            base={base}
            origin={origin}
            mode={mode}
          />
        </>
      )}
    </>
  );
}
