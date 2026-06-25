/**
 * @youeye/canvas/routes/notifications — Notifications proxy endpoint factory
 *
 * Usage:
 *   import { createNotificationsHandler } from "@youeye/canvas/routes/notifications";
 *   export const GET = createNotificationsHandler("ye-cinema");
 */

import { NextResponse } from "next/server";
import { getSession } from "../../auth/session";
import { createApiClient } from "../../api";

export function createNotificationsHandler(appId: string) {
  return async function GET(request: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);

    const api = createApiClient(appId);
    const data = await api.fetchNotifications(session.userId, limit);
    return NextResponse.json(data || { notifications: [], unread_count: 0 });
  };
}
