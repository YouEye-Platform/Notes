import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getOne, getMany, query } from "@/lib/db/client";
import { randomBytes } from "crypto";
import { emitNoteEdited } from "@/lib/timeline/emit";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const note = await getOne(
    `SELECT n.*,
            COALESCE(
              (SELECT json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color))
               FROM note_tags nt JOIN tags t ON t.id = nt.tag_id
               WHERE nt.note_id = n.id),
              '[]'::json
            ) as tags
     FROM notes n WHERE n.id = $1 AND n.user_id = $2`,
    [id, session.userId]
  );
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: note });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  // Handle share/unshare actions
  if (action === "share" || action === "unshare") {
    const newShared = action === "share";
    const shareToken = newShared ? randomBytes(16).toString("hex") : null;
    const note = await getOne(
      "UPDATE notes SET is_shared = $1, share_token = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4 RETURNING *",
      [newShared, shareToken, id, session.userId]
    );
    if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: note });
  }

  const body = await request.json();

  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (body.title !== undefined) { fields.push(`title = $${idx++}`); values.push(body.title); }
  if (body.content !== undefined) { fields.push(`content = $${idx++}`); values.push(body.content); }
  if (body.folder_id !== undefined) { fields.push(`folder_id = $${idx++}`); values.push(body.folder_id || null); }
  if (body.is_pinned !== undefined) { fields.push(`is_pinned = $${idx++}`); values.push(body.is_pinned); }
  if (body.note_type !== undefined) { fields.push(`note_type = $${idx++}`); values.push(body.note_type); }
  if (body.reminder_at !== undefined) {
    fields.push(`reminder_at = $${idx++}`);
    values.push(body.reminder_at);
    // Reset reminder_sent when reminder is changed
    fields.push(`reminder_sent = $${idx++}`);
    values.push(false);
  }

  if (fields.length === 0 && !body.tag_ids) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  let note: Record<string, unknown> | null = null;

  if (fields.length > 0) {
    fields.push(`updated_at = NOW()`);
    values.push(id, session.userId);

    note = await getOne(
      `UPDATE notes SET ${fields.join(", ")} WHERE id = $${idx++} AND user_id = $${idx} RETURNING *`,
      values
    ) as Record<string, unknown> | null;
    if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Handle tag updates
  if (body.tag_ids !== undefined) {
    await query("DELETE FROM note_tags WHERE note_id = $1", [id]);
    if (Array.isArray(body.tag_ids) && body.tag_ids.length > 0) {
      const tagValues = body.tag_ids.map((_: string, i: number) => `($1, $${i + 2})`).join(", ");
      await query(
        `INSERT INTO note_tags (note_id, tag_id) VALUES ${tagValues} ON CONFLICT DO NOTHING`,
        [id, ...body.tag_ids]
      );
    }
  }

  // Re-fetch with tags if we need the full object
  const fullNote = await getOne(
    `SELECT n.*,
            COALESCE(
              (SELECT json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color))
               FROM note_tags nt JOIN tags t ON t.id = nt.tag_id
               WHERE nt.note_id = n.id),
              '[]'::json
            ) as tags
     FROM notes n WHERE n.id = $1 AND n.user_id = $2`,
    [id, session.userId]
  );

  if (body.title !== undefined || body.content !== undefined) {
    const n = fullNote as { id: string; title: string; content: string };
    emitNoteEdited(session.userId, n.id, n.title, n.content).catch(() => {});
  }

  return NextResponse.json({ data: fullNote });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const result = await query("DELETE FROM notes WHERE id = $1 AND user_id = $2", [id, session.userId]);
  if (result.rowCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
