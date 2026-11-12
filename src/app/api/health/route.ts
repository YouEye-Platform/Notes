import { NextResponse } from "next/server";
import { runMigrations } from "@/lib/db/migrate";
import { BUILD_VERSION } from "@/lib/build-version";

const startTime = Date.now();
let dbReady = false;

export async function GET() {
  if (!dbReady) {
    try {
      await runMigrations();
      dbReady = true;
    } catch {
      // DB not available yet — still report healthy for the container
    }
  }

  return NextResponse.json({
    status: "ok",
    app: "ye-notes",
    version: BUILD_VERSION,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    database: dbReady ? "connected" : "pending",
  });
}
