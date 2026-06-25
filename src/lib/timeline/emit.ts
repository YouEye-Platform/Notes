/**
 * Notes Timeline Event Emitters
 *
 * Posts timeline entries to YE-UI for note creation and editing.
 * Each entry includes:
 *   - embed_path: lean URL for rich iframe card in timeline
 *   - data: structured content (description, url) for fallback/API access
 *   - tags: machine-readable metadata for filtering
 *
 * Debounced per userId+key to prevent duplicate entries.
 */

import { createApiClient } from "@/lib/api";

const api = createApiClient("ye-notes");
const postTimelineEntry = api.postTimelineEntry.bind(api);

const emitDebounce = new Map<string, number>();
const DEBOUNCE_MS: Record<string, number> = {
  "notes-note-created": 1 * 60 * 1000, // 1 minute
  "notes-note-edited": 5 * 60 * 1000,  // 5 minutes
};

async function emitIfNotDebounced(
  userId: string,
  key: string,
  collection: string,
  entry: Record<string, unknown>
): Promise<void> {
  const debounceKey = `${userId}:${key}`;
  const last = emitDebounce.get(debounceKey) ?? 0;
  const window = DEBOUNCE_MS[(entry as { entry_type?: string }).entry_type ?? ""] ?? 5 * 60 * 1000;
  if (Date.now() - last < window) return;
  emitDebounce.set(debounceKey, Date.now());

  if (emitDebounce.size > 1000) {
    const cutoff = Date.now() - 10 * 60 * 1000;
    for (const [k, v] of emitDebounce.entries()) {
      if (v < cutoff) emitDebounce.delete(k);
    }
  }

  try {
    await postTimelineEntry(userId, collection, entry);
  } catch {
    // Timeline is best-effort
  }
}

// ─── Note Created ───────────────────────────────────────────────

export async function emitNoteCreated(
  userId: string,
  noteId: string,
  title: string,
  content: string
): Promise<void> {
  const snippet = content.replace(/[#*_`~>\[\]()!]/g, "").slice(0, 200);

  await emitIfNotDebounced(userId, `created:${noteId}`, "history", {
    app_id: "notes",
    entry_type: "notes-note-created",
    title: `Created note: ${title || "Untitled"}`,
    embed_path: `/embed/timeline/note?id=${noteId}&action=created`,
    tags: { note_id: noteId },
    data: {
      description: snippet || "New note",
      url: `/notes/${noteId}`,
    },
  });
}

// ─── Note Edited ────────────────────────────────────────────────

export async function emitNoteEdited(
  userId: string,
  noteId: string,
  title: string,
  content: string
): Promise<void> {
  const snippet = content.replace(/[#*_`~>\[\]()!]/g, "").slice(0, 200);

  await emitIfNotDebounced(userId, `edited:${noteId}`, "history", {
    app_id: "notes",
    entry_type: "notes-note-edited",
    title: `Edited note: ${title || "Untitled"}`,
    embed_path: `/embed/timeline/note?id=${noteId}&action=edited`,
    tags: { note_id: noteId },
    data: {
      description: snippet || "Note updated",
      url: `/notes/${noteId}`,
    },
  });
}
