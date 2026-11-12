/**
 * @youeye/canvas/routes/health — Health check endpoint factory
 *
 * Usage:
 *   import { createHealthHandler } from "@youeye/canvas/routes/health";
 *   export const GET = createHealthHandler({
 *     appId: "ye-cinema",
 *     onHealthCheck: async () => { await runMigrations(); },
 *   });
 */

import { NextResponse } from "next/server";
import { BUILD_VERSION } from "@/lib/build-version";

const startTime = Date.now();

interface HealthConfig {
  /** App ID, e.g. "ye-cinema" */
  appId: string;
  /** Optional async callback run on each health check (e.g. DB migrations, cache cleanup) */
  onHealthCheck?: () => Promise<void>;
}

export function createHealthHandler(config: HealthConfig) {
  let initialized = false;

  return async function GET() {
    if (!initialized && config.onHealthCheck) {
      try {
        await config.onHealthCheck();
        initialized = true;
      } catch {
        // Not ready yet
      }
    }

    return NextResponse.json({
      status: "ok",
      app: config.appId,
      version: BUILD_VERSION,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      initialized,
    });
  };
}
