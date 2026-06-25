/**
 * @youeye/canvas/routes/theme — Theme sync endpoint factory
 *
 * Usage:
 *   import { createThemeHandler } from "@youeye/canvas/routes/theme";
 *   export const PUT = createThemeHandler("ye-cinema");
 */

import { NextResponse } from "next/server";
import { getSession } from "../../auth/session";
import { createApiClient } from "../../api";

export function createThemeHandler(appId: string) {
  return async function PUT(request: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { mode } = await request.json();
    if (!["dark", "light", "system"].includes(mode)) {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }

    const api = createApiClient(appId);
    const success = await api.syncThemeMode(session.userId, mode);
    return NextResponse.json({ success });
  };
}
