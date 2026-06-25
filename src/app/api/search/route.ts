import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMany } from "@/lib/db/client";
import { runMigrations } from "@/lib/db/migrate";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await runMigrations();

  const url = new URL(request.url);
  const q = url.searchParams.get("q");
  if (!q?.trim()) return NextResponse.json({ results: [] });

  const results = await getMany(
    `SELECT id, title, LEFT(content, 200) as preview, folder_id, is_pinned, updated_at,
            ts_rank(search_vector, plainto_tsquery('english', $2)) as rank
     FROM notes
     WHERE user_id = $1 AND search_vector @@ plainto_tsquery('english', $2)
     ORDER BY rank DESC, updated_at DESC
     LIMIT 20`,
    [session.userId, q.trim()]
  );

  return NextResponse.json({ results });
}
