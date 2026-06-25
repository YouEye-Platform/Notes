/**
 * @youeye/canvas/routes/settings — User settings endpoint factory
 *
 * Usage:
 *   import { createSettingsHandlers } from "@youeye/canvas/routes/settings";
 *   const { GET, PUT } = createSettingsHandlers("ye-cinema");
 *   export { GET, PUT };
 */

import { NextResponse } from "next/server";
import { getSession } from "../../auth/session";
import { createApiClient } from "../../api";

export function createSettingsHandlers(appId: string) {
  const api = createApiClient(appId);

  return {
    async GET() {
      const session = await getSession();
      if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const settings = await api.getUserSettings(session.userId);
      return NextResponse.json({ settings });
    },

    async PUT(request: Request) {
      const session = await getSession();
      if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const body = await request.json();
      const success = await api.saveUserSettings(session.userId, body.settings || body);
      return NextResponse.json({ success });
    },
  };
}
