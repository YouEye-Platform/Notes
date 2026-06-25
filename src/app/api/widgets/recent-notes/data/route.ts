import { NextResponse } from "next/server";
import { getMany } from "@/lib/db/client";
import { runMigrations } from "@/lib/db/migrate";

export async function GET(request: Request) {
  await runMigrations();
  const url = new URL(request.url);
  const userId = request.headers.get("x-youeye-user");
  if (!userId) return NextResponse.json({ items: [] });

  const notes = await getMany(
    `SELECT id, title, LEFT(content, 80) as preview, updated_at
     FROM notes WHERE user_id = $1
     ORDER BY updated_at DESC LIMIT 5`,
    [userId]
  );

  const externalUrl = process.env.NOTES_EXTERNAL_URL || "";

  return NextResponse.json({
    widget_type: "list",
    title: "Recent Notes",
    items: notes.map((n: Record<string, unknown>) => ({
      title: n.title || "Untitled",
      subtitle: n.preview,
      timestamp: n.updated_at,
      action: { type: "link", url: `${externalUrl}/notes/${n.id}` },
    })),
    empty_message: "No notes yet. Create your first note!",
    action: { label: "Open Notes", url: externalUrl },
  });
}
