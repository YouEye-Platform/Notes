"use client";

import { useEffect, useState } from "react";

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setTimeout(() => window.location.reload(), 500);
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center p-6 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground">
          <path d="M1 1l22 22" /><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" /><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" /><path d="M10.71 5.05A16 16 0 0 1 22.56 9" /><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
      </div>
      <h1 className="mb-2 text-2xl font-bold text-foreground">You&apos;re offline</h1>
      <p className="mb-6 max-w-sm text-muted-foreground">
        Notes needs a connection to sync your content.
        {isOnline ? " Connection restored — reloading..." : " We'll reload automatically when you're back online."}
      </p>
      {!isOnline && (
        <button onClick={() => window.location.reload()} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          Try again
        </button>
      )}
    </div>
  );
}
