import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getOne, query } from "@/lib/db/client";
import { runMigrations } from "@/lib/db/migrate";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await runMigrations();
  const { id } = await params;

  const body = await request.json();
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (body.name !== undefined) { fields.push(`name = $${idx++}`); values.push(body.name.trim()); }
  if (body.color !== undefined) { fields.push(`color = $${idx++}`); values.push(body.color); }

  if (fields.length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 });

  values.push(id, session.userId);

  try {
    const tag = await getOne(
      `UPDATE tags SET ${fields.join(", ")} WHERE id = $${idx++} AND user_id = $${idx} RETURNING *`,
      values
    );
    if (!tag) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: tag });
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === "23505") {
      return NextResponse.json({ error: "Tag name already exists" }, { status: 409 });
    }
    throw err;
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await runMigrations();
  const { id } = await params;

  const result = await query("DELETE FROM tags WHERE id = $1 AND user_id = $2", [id, session.userId]);
  if (result.rowCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
