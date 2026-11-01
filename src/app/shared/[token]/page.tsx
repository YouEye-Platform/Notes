import { getLocale } from "next-intl/server";
import { getTranslations as getInterfaceTranslations } from "next-intl/server";
import { StickyNote } from "lucide-react";
import { headers } from "next/headers";

interface SharedNote {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly created_at: string;
}

async function fetchSharedNote(token: string): Promise<SharedNote | null> {
  try {
    const hdrs = await headers();
    const host = hdrs.get("host");
    if (!host) throw new Error("Missing Host header");
    const proto = hdrs.get("x-forwarded-proto") ?? "https";
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? `${proto}://${host}`;
    const res = await fetch(`${baseUrl}/api/notes/shared/${token}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data ?? null;
  } catch {
    return null;
  }
}

function formatDate(dateStr: string, locale: string): string {
  return new Date(dateStr).toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function SharedNotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const translateInterface = await getInterfaceTranslations("interface");

  const locale = await getLocale();
  const { token } = await params;
  const note = await fetchSharedNote(token);

  if (!note) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <StickyNote className="h-16 w-16 text-muted-foreground/40 mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">{translateInterface("m0019dfc4b32d")}</h1>
          <p className="text-muted-foreground">
            {translateInterface("m5d7045f7759a")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/40 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <StickyNote className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            {translateInterface("m2a9f7766212c")}</span>
        </div>
      </header>

      {/* Content */}
      <article className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {note.title || translateInterface("mf59ab8d1331b")}
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          {formatDate(note.created_at, locale)}
        </p>
        <div className="text-foreground whitespace-pre-wrap leading-relaxed">
          {note.content}
        </div>
      </article>

      {/* Footer */}
      <footer className="border-t border-border/40 px-6 py-6 mt-12">
        <p className="text-center text-xs text-muted-foreground">
          {translateInterface("m5b37c6d5e72a")}</p>
      </footer>
    </div>
  );
}
