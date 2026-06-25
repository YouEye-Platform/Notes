import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getOne, query } from "@/lib/db/client";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();

  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (body.name !== undefined) { fields.push(`name = $${idx++}`); values.push(body.name.trim()); }
  if (body.color !== undefined) { fields.push(`color = $${idx++}`); values.push(body.color); }
  if (body.sort_order !== undefined) { fields.push(`sort_order = $${idx++}`); values.push(body.sort_order); }

  if (fields.length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 });

  fields.push(`updated_at = NOW()`);
  values.push(id, session.userId);

  const folder = await getOne(
    `UPDATE folders SET ${fields.join(", ")} WHERE id = $${idx++} AND user_id = $${idx} RETURNING *`,
    values
  );
  if (!folder) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ folder });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const result = await query("DELETE FROM folders WHERE id = $1 AND user_id = $2", [id, session.userId]);
  if (result.rowCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
