import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMany, getOne } from "@/lib/db/client";
import { runMigrations } from "@/lib/db/migrate";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await runMigrations();

  const folders = await getMany(
    "SELECT f.*, (SELECT COUNT(*) FROM notes n WHERE n.folder_id = f.id) as note_count FROM folders f WHERE f.user_id = $1 ORDER BY f.sort_order, f.name",
    [session.userId]
  );
  return NextResponse.json({ data: folders });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await runMigrations();

  const { name, color = "#3b82f6" } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const folder = await getOne(
    "INSERT INTO folders (user_id, name, color) VALUES ($1, $2, $3) RETURNING *",
    [session.userId, name.trim(), color]
  );
  return NextResponse.json({ data: folder }, { status: 201 });
}
