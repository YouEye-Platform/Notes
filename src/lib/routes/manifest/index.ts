/**
 * @youeye/canvas/routes/manifest — Manifest endpoint factory
 *
 * Usage:
 *   import { createManifestHandler } from "@youeye/canvas/routes/manifest";
 *   export const GET = createManifestHandler({
 *     id: "ye-cinema",
 *     name: "Cinema",
 *     description: "Movie & TV discovery",
 *     icon: "Film",
 *     permissions: ["timeline:write", "widgets:register"],
 *     widgets: [...],
 *   });
 */

import { NextResponse } from "next/server";
import type { AppManifest } from "../../types";

export function createManifestHandler(manifest: AppManifest) {
  return async function GET() {
    return NextResponse.json({
      ...manifest,
      version: process.env.npm_package_version || manifest.version,
    });
  };
}
