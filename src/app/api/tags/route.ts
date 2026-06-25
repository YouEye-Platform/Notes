import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMany, getOne } from "@/lib/db/client";
import { runMigrations } from "@/lib/db/migrate";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await runMigrations();

  const tags = await getMany(
    "SELECT * FROM tags WHERE user_id = $1 ORDER BY name",
    [session.userId]
  );

  return NextResponse.json({ data: tags });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await runMigrations();

  const body = await request.json();
  const { name, color = "#6b7280" } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Tag name is required" }, { status: 400 });
  }

  try {
    const tag = await getOne(
      "INSERT INTO tags (user_id, name, color) VALUES ($1, $2, $3) RETURNING *",
      [session.userId, name.trim(), color]
    );
    return NextResponse.json({ data: tag }, { status: 201 });
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === "23505") {
      return NextResponse.json({ error: "Tag already exists" }, { status: 409 });
    }
    throw err;
  }
}
