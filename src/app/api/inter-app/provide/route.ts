import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getMany } from "@/lib/db/client";
import { runMigrations } from "@/lib/db/migrate";

export async function POST(request: Request) {
  const session = await getSession("ye-notes");
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await runMigrations();
  const body = await request.json();
  const { request_type, data } = body;

  if (request_type === "search" && data?.query) {
    const userId = session.userId;
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
