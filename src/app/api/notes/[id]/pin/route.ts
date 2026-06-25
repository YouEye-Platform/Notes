import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getOne } from "@/lib/db/client";

export async function PUT(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const note = await getOne(
    "UPDATE notes SET is_pinned = NOT is_pinned, updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *",
    [id, session.userId]
  );
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: note });
}
