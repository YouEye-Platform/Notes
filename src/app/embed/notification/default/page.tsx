"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bell, StickyNote } from "lucide-react";

interface NotificationData {
  id: string;
  title: string;
  message?: string | null;
  created_at?: string;
}

export default function NotificationEmbedPage() {
  return (
    <Suspense fallback={<NotificationCardFallback />}>
      <NotificationEmbedContent />
    </Suspense>
  );
}

function NotificationEmbedContent() {
  const params = useSearchParams();
  const notificationId = params.get("notification_id");
  const [notification, setNotification] = useState<NotificationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/notifications?limit=100", { cache: "no-store" });
        const data = res.ok ? await res.json() : { notifications: [] };
        const found =
          (data.notifications as NotificationData[] | undefined)?.find((item) => item.id === notificationId) ?? null;
        if (!cancelled) setNotification(found);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [notificationId]);

  const message = useMemo(() => {
    if (loading) return "Loading notification...";
    return notification?.message || "Open Notes to view this reminder.";
  }, [loading, notification?.message]);

  return (
    <div className="rounded-xl border border-border bg-card p-3 text-foreground">
      <div className="flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {notification ? <StickyNote className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{notification?.title || "Notes notification"}</h3>
          <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
    </div>
  );
}

function NotificationCardFallback() {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-foreground">
      <div className="flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Bell className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">Notes notification</h3>
          <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">Loading notification...</p>
        </div>
      </div>
    </div>
  );
}
