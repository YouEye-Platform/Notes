import { NextResponse } from "next/server";
import { getMany } from "@/lib/db/client";
import { runMigrations } from "@/lib/db/migrate";

export async function POST(request: Request) {
  await runMigrations();
  const body = await request.json();
  const { request_type, data } = body;

  if (request_type === "search" && data?.query) {
    const userId = data.user_id;
    if (!userId) return NextResponse.json({ results: [] });

    const results = await getMany(
      `SELECT id, title, LEFT(content, 150) as preview, updated_at
       FROM notes
       WHERE user_id = $1 AND search_vector @@ plainto_tsquery('english', $2)
       ORDER BY updated_at DESC LIMIT 5`,
      [userId, data.query]
    );

    return NextResponse.json({
      provider: "ye-notes",
      results: results.map((r: Record<string, unknown>) => ({
        title: r.title,
        preview: r.preview,
        url: `/notes/${r.id}`,
        updated_at: r.updated_at,
      })),
    });
  }

  return NextResponse.json({ error: "Unknown request type" }, { status: 400 });
}
