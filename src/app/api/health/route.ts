import { NextResponse } from "next/server";
import { runMigrations } from "@/lib/db/migrate";
import { APP_VERSION, SOURCE_TREE } from "@/lib/app-version";

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
    version: APP_VERSION,
    source_tree: SOURCE_TREE,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    database: dbReady ? "connected" : "pending",
  });
}
