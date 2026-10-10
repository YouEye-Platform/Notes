/**
 * @youeye/canvas/routes/inter-app — Inter-app communication endpoint factory
 *
 * Each app registers handlers for request types it supports.
 *
 * Usage:
 *   import { createInterAppHandler } from "@youeye/canvas/routes/inter-app";
 *   export const POST = createInterAppHandler("ye-cinema", {
 *     search: async (data) => {
 *       const results = await searchWatchlist(data.query);
 *       return { provider: "ye-cinema", results };
 *     },
 *     "info-card": async (data) => {
 *       return fetchMovieCard(data.url);
 *     },
 *   });
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

type InterAppHandler = (data: Record<string, unknown>, context: { userId: string }) => Promise<Record<string, unknown>>;

export function createInterAppHandler(appId: string, handlers: Record<string, InterAppHandler>) {
  return async function POST(request: Request) {
    const session = await getSession(appId);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    let body;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const { request_type, data } = body;

    const handler = Object.hasOwn(handlers, request_type) ? handlers[request_type] : undefined;
    if (!handler) {
      return NextResponse.json({ error: "Unknown request type" }, { status: 400 });
    }

    try {
      const safeData = data && typeof data === "object" && !Array.isArray(data) ? { ...data } : {};
      // Acting identity is authenticated context; request data cannot nominate it.
      delete safeData.userId;
      delete safeData.user_id;
      const result = await handler(safeData, { userId: session.userId });
      return NextResponse.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}
