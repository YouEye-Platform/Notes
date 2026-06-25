import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMany, getOne, query } from "@/lib/db/client";
import { runMigrations } from "@/lib/db/migrate";
import { emitNoteCreated } from "@/lib/timeline/emit";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await runMigrations();

  const url = new URL(request.url);
  const folderId = url.searchParams.get("folder_id");
  const pinned = url.searchParams.get("pinned");
  const shared = url.searchParams.get("shared");
  const noteType = url.searchParams.get("note_type");
  const hasReminder = url.searchParams.get("has_reminder");
  const tagId = url.searchParams.get("tag_id");
  const sort = url.searchParams.get("sort") || "updated_desc";
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 200);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);

  let where = "WHERE n.user_id = $1";
  const params: unknown[] = [session.userId];
  let paramIndex = 2;

  if (folderId) {
    where += ` AND n.folder_id = $${paramIndex++}`;
    params.push(folderId);
  }
  if (pinned === "true") where += " AND n.is_pinned = true";
  if (shared === "true") where += " AND n.is_shared = true";
  if (noteType) {
    where += ` AND n.note_type = $${paramIndex++}`;
    params.push(noteType);
  }
  if (hasReminder === "true") where += " AND n.reminder_at IS NOT NULL";
  if (tagId) {
    where += ` AND EXISTS (SELECT 1 FROM note_tags nt2 WHERE nt2.note_id = n.id AND nt2.tag_id = $${paramIndex++})`;
    params.push(tagId);
  }

  let orderBy: string;
  switch (sort) {
    case "updated_asc":
      orderBy = "n.updated_at ASC";
      break;
    case "alpha":
      orderBy = "LOWER(n.title) ASC, n.updated_at DESC";
      break;
    case "created_desc":
      orderBy = "n.created_at DESC";
      break;
    default:
      orderBy = "n.is_pinned DESC, n.updated_at DESC";
  }

  const notes = await getMany(
    `SELECT n.id, n.title, LEFT(n.content, 200) as content, n.folder_id,
            n.is_pinned, n.is_shared, n.share_token, n.note_type,
            n.reminder_at, n.reminder_sent,
            n.created_at, n.updated_at,
            COALESCE(
              (SELECT json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color))
               FROM note_tags nt JOIN tags t ON t.id = nt.tag_id
               WHERE nt.note_id = n.id),
              '[]'::json
            ) as tags
     FROM notes n ${where}
     ORDER BY ${orderBy}
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset]
  );

  return NextResponse.json({ data: notes });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await runMigrations();

  const body = await request.json();
  const {
    title = "",
    content = "",
    folder_id = null,
    note_type = "text",
    reminder_at = null,
    tag_ids = [],
  } = body;

  const note = await getOne(
    `INSERT INTO notes (user_id, title, content, folder_id, note_type, reminder_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [session.userId, title, content, folder_id, note_type, reminder_at]
  );

  const n = note as { id: string; title: string; content: string };

  // Link tags
  if (Array.isArray(tag_ids) && tag_ids.length > 0) {
    const tagValues = tag_ids.map((_: string, i: number) => `($1, $${i + 2})`).join(", ");
    await query(
      `INSERT INTO note_tags (note_id, tag_id) VALUES ${tagValues} ON CONFLICT DO NOTHING`,
      [n.id, ...tag_ids]
    );
  }

  emitNoteCreated(session.userId, n.id, n.title, n.content).catch(() => {});

  return NextResponse.json({ data: note }, { status: 201 });
}
