"use client";

/**
 * PWA Install Banner — Generic for Canvas apps
 *
 * Shows a dismissible bottom banner prompting the user to install the app
 * as a PWA. Only appears on mobile devices when the browser fires the
 * `beforeinstallprompt` event. Dismissal is stored in localStorage.
 */

import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface InstallBannerProps {
  appName: string;
  dismissKey?: string;
}

export function InstallBanner({ appName, dismissKey }: InstallBannerProps) {
  const storageKey = dismissKey || `ye-pwa-install-dismissed-${appName.toLowerCase()}`;
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (localStorage.getItem(storageKey)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [storageKey]);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(storageKey, "1");
  }, [storageKey]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] flex items-center gap-3 rounded-xl border border-border/40 bg-background/95 p-3 shadow-xl backdrop-blur-md md:left-auto md:right-4 md:max-w-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/20">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">Install {appName}</p>
        <p className="text-xs text-muted-foreground truncate">
          Add to home screen for quick access
        </p>
      </div>
      <button
        onClick={handleInstall}
        className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Install
      </button>
      <button
        onClick={handleDismiss}
        className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
