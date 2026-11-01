import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAppLocale } from "@/i18n/runtime";

export async function GET() {
  if (!await getSession("ye-notes").catch(() => null)) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ locale: await getAppLocale() }, { headers: { "Cache-Control": "private, no-store" } });
}
