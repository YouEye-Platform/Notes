import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getOne } from "@/lib/db/client";
import { randomBytes } from "crypto";

export async function PUT(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  // Check current state
  const existing = await getOne("SELECT is_shared, share_token FROM notes WHERE id = $1 AND user_id = $2", [id, session.userId]);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isCurrentlyShared = existing.is_shared;
  const newShared = !isCurrentlyShared;
  const shareToken = newShared ? randomBytes(16).toString("hex") : null;

  const note = await getOne(
    "UPDATE notes SET is_shared = $1, share_token = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4 RETURNING *",
    [newShared, shareToken, id, session.userId]
  );
  return NextResponse.json({ data: note });
}
