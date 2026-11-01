"use client";
import { useLocale } from "next-intl";

import { useTranslations as useInterfaceTranslations } from "next-intl";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  StickyNote,
  Plus,
  Search,
  Pin,
  Share2,
  Bell,
  CheckSquare,
  Tag,
  FolderOpen,
  Loader2,
  PanelLeft,
  AlertCircle,
  RefreshCw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface TagData {
  readonly id: string;
  readonly name: string;
  readonly color: string;
}

interface Note {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly folder_id: string | null;
  readonly is_pinned: boolean;
  readonly share_token: string | null;
  readonly note_type: string;
  readonly reminder_at: string | null;
  readonly reminder_sent: boolean;
  readonly tags: readonly TagData[];
  readonly created_at: string;
  readonly updated_at: string;
}

interface Folder {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly note_count: number;
}

type SidebarFilter = "all" | "pinned" | "reminders";
type NoteTypeFilter = "all" | "checklist";
type SortMode = "updated_desc" | "updated_asc" | "alpha" | "created_desc";

const SORT_LABELS: Record<SortMode, string> = {
  updated_desc: "m7ffd1b8aed40",
  updated_asc: "m505dc450753e",
  alpha: "ma49d631f8c6c",
  created_desc: "m97833a0e37e9",
};

export default function HomePage() {
  const locale = useLocale();
  const translateInterface = useInterfaceTranslations("interface");

  const router = useRouter();
  const [notes, setNotes] = useState<readonly Note[]>([]);
  const [folders, setFolders] = useState<readonly Folder[]>([]);
  const [tags, setTags] = useState<readonly TagData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCollections, setShowCollections] = useState(false);

  // Filters
  const [sidebarFilter, setSidebarFilter] = useState<SidebarFilter>("all");
  const [noteTypeFilter, setNoteTypeFilter] = useState<NoteTypeFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("updated_desc");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Folder creation
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("#3b82f6");

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [notesRes, foldersRes, tagsRes] = await Promise.all([
        fetch("/api/notes?limit=200"),
        fetch("/api/folders"),
        fetch("/api/tags"),
      ]);
      if (!notesRes.ok || !foldersRes.ok || !tagsRes.ok) throw new Error(translateInterface("uxNotesLoadFailed"));
      if (notesRes.ok) {
        const d = await notesRes.json();
        setNotes(d.data ?? []);
      }
      if (foldersRes.ok) {
        const d = await foldersRes.json();
        setFolders(d.data ?? []);
      }
      if (tagsRes.ok) {
        const d = await tagsRes.json();
        setTags(d.data ?? []);
      }
    } catch {
      setError(translateInterface("uxNotesLoadFailed"));
    } finally {
      setLoading(false);
    }
  }, [translateInterface]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName.trim(), color: newFolderColor }),
      });
      if (res.ok) {
        setNewFolderName("");
        setNewFolderColor("#3b82f6");
        setCreatingFolder(false);
        fetchData();
      }
    } catch {}
  };

  // Client-side filtering + sorting
  const filteredNotes = notes
    .filter((note) => {
      if (sidebarFilter === "pinned" && !note.is_pinned) return false;
      if (sidebarFilter === "reminders" && !note.reminder_at) return false;
      if (noteTypeFilter === "checklist" && note.note_type !== "checklist") return false;
      if (selectedFolder && note.folder_id !== selectedFolder) return false;
      if (selectedTag && !note.tags.some((t) => t.id === selectedTag)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          note.title.toLowerCase().includes(q) ||
          note.content.toLowerCase().includes(q) ||
          note.tags.some((t) => t.name.toLowerCase().includes(q))
        );
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortMode) {
        case "updated_asc":
          return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        case "alpha":
          return (a.title || "").localeCompare(b.title || "");
        case "created_desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default: {
          // Default: pinned first, then most recent
          if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        }
      }
    });

  const pinnedNotes = filteredNotes.filter((n) => n.is_pinned);
  const unpinnedNotes = filteredNotes.filter((n) => !n.is_pinned);
  const showPinnedSection = sidebarFilter === "all" && noteTypeFilter === "all" && !selectedFolder && !selectedTag && !searchQuery && pinnedNotes.length > 0;

  // Counts for sidebar
  const totalCount = notes.length;
  const pinnedCount = notes.filter((n) => n.is_pinned).length;
  const reminderCount = notes.filter((n) => n.reminder_at).length;

  const getFolderForNote = (folderId: string | null): Folder | undefined => {
    if (!folderId) return undefined;
    return folders.find((f) => f.id === folderId);
  };

  const formatRelativeTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    if (diffMins < 1) return relative.format(0, "second");
    if (diffMins < 60) return relative.format(-diffMins, "minute");
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return relative.format(-diffHours, "hour");
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return relative.format(-diffDays, "day");
    return date.toLocaleDateString(locale);
  };

  const parseChecklistProgress = (content: string): { done: number; total: number } | null => {
    const lines = content.split("\n").filter((l) => /^- \[[ x]\] /.test(l));
    if (lines.length === 0) return null;
    const done = lines.filter((l) => l.startsWith("- [x] ")).length;
    return { done, total: lines.length };
  };

  const getPreview = (content: string): string => {
    const lines = content
      .split("\n")
      .filter((l) => l.trim() && !/^- \[[ x]\] /.test(l));
    return lines.slice(0, 2).join(" ").slice(0, 120);
  };

  const clearAllFilters = () => {
    setSidebarFilter("all");
    setNoteTypeFilter("all");
    setSelectedFolder(null);
    setSelectedTag(null);
    setSearchQuery("");
  };

  const hasActiveFilter = sidebarFilter !== "all" || noteTypeFilter !== "all" || selectedFolder || selectedTag || searchQuery;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" role="status" aria-label={translateInterface("uxLoadingNotes")}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="notes-workspace">
      <button className="notes-collections-toggle" aria-controls="notes-collections" aria-expanded={showCollections}
        onClick={() => setShowCollections((open) => !open)}>
        <PanelLeft className="h-4 w-4" /> {translateInterface("uxCollections")}
      </button>
      {/* Sidebar */}
      <aside id="notes-collections" aria-label={translateInterface("uxNoteCollections")} className={`notes-sidebar ${showCollections ? "is-open" : ""}`}>
        <div className="px-3 pb-4 pt-2 text-sm font-semibold">{translateInterface("uxYourCollection")}</div>
        {/* Main filters */}
        <button
          onClick={() => { setSidebarFilter("all"); setSelectedFolder(null); setSelectedTag(null); }}
          className={`sidebar-item w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2.5 ${
            sidebarFilter === "all" && !selectedFolder && !selectedTag ? "active" : ""
          }`}
        >
          <StickyNote className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1">{translateInterface("m00a187caec84")}</span>
          <span className="text-xs text-muted-foreground tabular-nums">{totalCount}</span>
        </button>
        <button
          onClick={() => { setSidebarFilter("pinned"); setSelectedFolder(null); setSelectedTag(null); }}
          className={`sidebar-item w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2.5 ${
            sidebarFilter === "pinned" ? "active" : ""
          }`}
        >
          <Pin className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1">{translateInterface("mf20c87946555")}</span>
          <span className="text-xs text-muted-foreground tabular-nums">{pinnedCount}</span>
        </button>
        <button
          onClick={() => { setSidebarFilter("reminders"); setSelectedFolder(null); setSelectedTag(null); }}
          className={`sidebar-item w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2.5 ${
            sidebarFilter === "reminders" ? "active" : ""
          }`}
        >
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1">{translateInterface("m7971dd752669")}</span>
          <span className="text-xs text-muted-foreground tabular-nums">{reminderCount}</span>
        </button>

        <div className="my-2 border-t border-border/40" />

        {/* Folders */}
        <div className="flex items-center justify-between px-3 mb-0.5">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {translateInterface("mc4d6bb200f4c")}</span>
          <button
            aria-label={translateInterface("uxNewFolder")} onClick={() => setCreatingFolder(true)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {creatingFolder && (
          <div className="px-2 py-1.5 flex flex-col gap-2">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              aria-label={translateInterface("m14d34edf50ef")}
              placeholder={translateInterface("m14d34edf50ef")}
              className="w-full px-2 py-1.5 text-sm border border-border/60 rounded-lg bg-card/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFolder();
                if (e.key === "Escape") setCreatingFolder(false);
              }}
              autoFocus
            />
            <div className="flex items-center gap-2">
              <input
                aria-label={translateInterface("uxFolderColor")} type="color"
                value={newFolderColor}
                onChange={(e) => setNewFolderColor(e.target.value)}
                className="h-6 w-6 rounded cursor-pointer border-0"
              />
              <Button size="sm" onClick={handleCreateFolder} className="flex-1 h-7 text-xs">
                {translateInterface("m4759498ac2a7")}</Button>
              <Button size="sm" variant="ghost" aria-label={translateInterface("uxCancelFolderCreation")} onClick={() => setCreatingFolder(false)} className="h-7 text-xs px-2">
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {folders.map((folder) => (
          <button
            key={folder.id}
            onClick={() => {
              setSelectedFolder(folder.id);
              setSidebarFilter("all");
              setSelectedTag(null);
            }}
            className={`sidebar-item w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2.5 ${
              selectedFolder === folder.id ? "active" : ""
            }`}
          >
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: folder.color }}
            />
            <span className="truncate flex-1">{folder.name}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{folder.note_count}</span>
          </button>
        ))}

        {tags.length > 0 && (
          <>
            <div className="my-2 border-t border-border/40" />
            <div className="px-3 mb-0.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {translateInterface("m1331275bc537")}</span>
            </div>
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => {
                  setSelectedTag(tag.id === selectedTag ? null : tag.id);
                  setSidebarFilter("all");
                  setSelectedFolder(null);
                }}
                className={`sidebar-item w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2.5 ${
                  selectedTag === tag.id ? "active" : ""
                }`}
              >
                <Tag className="h-3.5 w-3.5" style={{ color: tag.color }} />
                <span className="truncate flex-1">{tag.name}</span>
              </button>
            ))}
          </>
        )}
      </aside>

      {/* Main Area */}
      <section className="notes-main">
        <div className="max-w-6xl mx-auto">
          <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-1 text-sm text-muted-foreground">{translateInterface("uxThoughtsIntroduction")}</p>
              <h1 className="text-3xl font-semibold tracking-tight">{selectedFolder ? folders.find((folder) => folder.id === selectedFolder)?.name : selectedTag ? tags.find((tag) => tag.id === selectedTag)?.name : sidebarFilter === "pinned" ? translateInterface("uxPinnedNotes") : sidebarFilter === "reminders" ? translateInterface("m7971dd752669") : translateInterface("m00a187caec84")}</h1>
            </div>
            <Button onClick={() => router.push("/notes/new")} className="notes-create min-h-11 gap-2 rounded-xl">
              <Plus className="h-4 w-4" /> {translateInterface("mb763c5ea3c57")}
            </Button>
          </div>
          {/* Search and filtering stay together as the collection changes. */}
          <div className="notes-toolbar">
            <div className="relative min-w-0 flex-1 basis-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label={translateInterface("uxSearchNotes")}
                placeholder={translateInterface("m68e23f8d5d50")}
                className="w-full pl-10 pr-4 py-2 border border-border/60 rounded-xl bg-card/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
              />
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
              <button
                aria-pressed={noteTypeFilter === "all"} onClick={() => setNoteTypeFilter("all")}
                className={`min-h-11 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  noteTypeFilter === "all" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {translateInterface("ma52ace420f21")}</button>
              <button
                aria-pressed={noteTypeFilter === "checklist"} onClick={() => setNoteTypeFilter("checklist")}
                className={`min-h-11 px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                  noteTypeFilter === "checklist" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <CheckSquare className="h-3 w-3" />
                {translateInterface("m4d03ed9d62c8")}</button>
            </div>

            <label className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground">
              <span className="sr-only">{translateInterface("uxSortNotes")}</span>
              <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}
                className="min-h-11 rounded-lg border border-border bg-card px-3 text-sm text-foreground">
                {Object.entries(SORT_LABELS).map(([value, label]) => <option key={value} value={value}>{translateInterface(label)}</option>)}
              </select>
            </label>
          </div>

          {/* Active filter indicator */}
          {hasActiveFilter && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs text-muted-foreground">{translateInterface("m1fa89b5003f2")}</span>
              {sidebarFilter !== "all" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-accent">
                  {sidebarFilter === "pinned" ? translateInterface("mf20c87946555") : translateInterface("m7971dd752669")}
                </span>
              )}
              {selectedFolder && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-accent">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: folders.find((f) => f.id === selectedFolder)?.color }} />
                  {folders.find((f) => f.id === selectedFolder)?.name}
                </span>
              )}
              {selectedTag && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-accent">
                  {tags.find((t) => t.id === selectedTag)?.name}
                </span>
              )}
              {noteTypeFilter !== "all" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-accent">
                  {translateInterface("m4d03ed9d62c8")}</span>
              )}
              <button onClick={clearAllFilters} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {translateInterface("uxClearFilters")}</button>
            </div>
          )}

          {/* Empty state */}
          {error ? (
            <div role="alert" className="rounded-xl border border-border bg-card p-6">
              <AlertCircle className="mb-3 h-5 w-5 text-destructive" />
              <h2 className="mb-2 font-semibold">{translateInterface("uxNotesUnavailable")}</h2>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" className="mt-4 min-h-11 gap-2" onClick={fetchData}><RefreshCw className="h-4 w-4" />{translateInterface("uxTryAgain")}</Button>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="h-20 w-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-5">
                <StickyNote className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {hasActiveFilter ? translateInterface("m5a859d101f66") : translateInterface("ma092ad6b8be0")}
              </h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                {hasActiveFilter
                  ? translateInterface("m16638be7544f")
                  : translateInterface("m98685211968d")}
              </p>
              {!hasActiveFilter && (
                <Button
                  onClick={() => router.push("/notes/new")}
                  className="notes-create rounded-xl"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  {translateInterface("m9e27433710c4")}</Button>
              )}
            </div>
          ) : (
            <>
              {/* Pinned Section */}
              {showPinnedSection && (
                <div className="mb-8">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                    {translateInterface("mf20c87946555")}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {pinnedNotes.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        folder={getFolderForNote(note.folder_id)}
                        formatRelativeTime={formatRelativeTime}
                        parseChecklistProgress={parseChecklistProgress}
                        getPreview={getPreview}
                        onClick={() => router.push(`/notes/${note.id}`)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* All Notes Section */}
              <div>
                {showPinnedSection && (
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                    {translateInterface("m00a187caec84")}</h3>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {(showPinnedSection ? unpinnedNotes : filteredNotes).map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      folder={getFolderForNote(note.folder_id)}
                      formatRelativeTime={formatRelativeTime}
                      parseChecklistProgress={parseChecklistProgress}
                      getPreview={getPreview}
                      onClick={() => router.push(`/notes/${note.id}`)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

/* ─── Note Card Component ─── */

interface NoteCardProps {
  note: Note;
  folder: Folder | undefined;
  formatRelativeTime: (d: string) => string;
  parseChecklistProgress: (c: string) => { done: number; total: number } | null;
  getPreview: (c: string) => string;
  onClick: () => void;
}

function NoteCard({ note, folder, formatRelativeTime, parseChecklistProgress, getPreview, onClick }: NoteCardProps) {
  const translateInterface = useInterfaceTranslations("interface");

  const progress = note.note_type === "checklist" ? parseChecklistProgress(note.content) : null;
  const isOverdue = note.reminder_at && new Date(note.reminder_at) < new Date() && !note.reminder_sent;
  const hasUpcomingReminder = note.reminder_at && !note.reminder_sent && new Date(note.reminder_at) >= new Date();

  return (
    <button
      onClick={onClick}
      className="note-card w-full text-left border border-border/40 bg-card rounded-xl p-4 flex flex-col gap-2.5"
      style={{ borderLeftWidth: "3px", borderLeftColor: folder?.color || "transparent" }}
    >
      {/* Title */}
      <h3 className="font-semibold text-base text-foreground line-clamp-2 leading-snug">
        {note.title || translateInterface("mf59ab8d1331b")}
      </h3>

      {/* Smart preview */}
      {note.note_type === "checklist" && progress ? (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckSquare className="h-3 w-3" />
            <span>{translateInterface("mce46c101706e", { done: progress.done, total: progress.total })}</span>
          </div>
          <div className="checklist-preview-bar">
            <div
              className="checklist-preview-fill"
              style={{ width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
          {getPreview(note.content) || translateInterface("m9cd41f71ef9b")}
        </p>
      )}

      {/* Tags */}
      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {note.tags.slice(0, 3).map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: `${tag.color}18`,
                color: tag.color,
              }}
            >
              {tag.name}
            </span>
          ))}
          {note.tags.length > 3 && (
            <span className="text-xs text-muted-foreground px-1">
              +{note.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2 mt-auto pt-1">
        {folder && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: folder.color }} />
            {folder.name}
          </span>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {formatRelativeTime(note.updated_at)}
        </span>
        {note.is_pinned && <Pin className="h-3 w-3 text-amber-500" />}
        {(hasUpcomingReminder || isOverdue) && (
          <Bell className={`h-3 w-3 ${isOverdue ? "text-destructive" : "text-blue-500"}`} />
        )}
        {note.share_token && <Share2 className="h-3 w-3 text-blue-400" />}
      </div>
    </button>
  );
}
