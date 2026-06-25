/**
 * @youeye/canvas/routes/inter-app — Inter-app communication endpoint factory
 *
 * Each app registers handlers for request types it supports.
 *
 * Usage:
 *   import { createInterAppHandler } from "@youeye/canvas/routes/inter-app";
 *   export const POST = createInterAppHandler({
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

type InterAppHandler = (data: Record<string, unknown>) => Promise<Record<string, unknown>>;

export function createInterAppHandler(handlers: Record<string, InterAppHandler>) {
  return async function POST(request: Request) {
    const body = await request.json();
    const { request_type, data } = body;

    const handler = handlers[request_type];
    if (!handler) {
      return NextResponse.json({ error: "Unknown request type" }, { status: 400 });
    }

    try {
      const result = await handler(data ?? {});
      return NextResponse.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}
