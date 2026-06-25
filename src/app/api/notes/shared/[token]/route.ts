import { NextResponse } from "next/server";
import { getOne } from "@/lib/db/client";
import { runMigrations } from "@/lib/db/migrate";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  await runMigrations();
  const { token } = await params;

  const note = await getOne(
    "SELECT id, title, content, created_at, updated_at FROM notes WHERE share_token = $1 AND is_shared = true",
    [token]
  );
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ note });
}
