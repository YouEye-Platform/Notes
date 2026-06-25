/**
 * Notes Timeline Embed — Note Card
 *
 * Compact card rendered as iframe inside YE-UI timeline entries.
 * Fetches note data from the local database.
 *
 * Query params:
 *   ?id=<uuid>        — Note ID
 *   &action=created   — "created" or "edited"
 */

import { getOne } from "@/lib/db/client";
import { runMigrations } from "@/lib/db/migrate";
import { StickyNote, FilePen, FileText } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ id?: string; action?: string }>;
}

export default async function TimelineNotePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { id, action = "created" } = params;

  if (!id) {
    return <ErrorCard message="No note specified" />;
  }

  try {
    await runMigrations();
    const note = await getOne(
      "SELECT id, title, LEFT(content, 300) as content, updated_at FROM notes WHERE id = $1",
      [id]
    );

    if (!note) {
      return <ErrorCard message="Note not found" />;
    }

    const n = note as { id: string; title: string; content: string; updated_at: string };
    const title = n.title || "Untitled";
    const snippet = (n.content || "")
      .replace(/[#*_`~>\[\]()!]/g, "")
      .slice(0, 140);
    const isEdit = action === "edited";
    const Icon = isEdit ? FilePen : StickyNote;
    const label = isEdit ? "Edited Note" : "Created Note";
    const color = isEdit ? "text-amber-500" : "text-emerald-500";

    return (
      <div className="p-2.5">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded bg-muted/50 flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className={`h-3.5 w-3.5 ${color}`} />
              <span className={`text-[11px] font-medium ${color}`}>{label}</span>
            </div>

            <p className="text-sm font-semibold text-foreground line-clamp-1">
              {title}
            </p>

            {snippet && (
              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                {snippet}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  } catch {
    return <ErrorCard message="Failed to load note" />;
  }
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="p-2.5">
      <p className="text-xs text-muted-foreground py-2 text-center">{message}</p>
    </div>
  );
}
