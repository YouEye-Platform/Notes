"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pin,
  Share2,
  Trash2,
  Loader2,
  Check,
  ChevronDown,
  CheckSquare,
  Type,
  Tag,
  Bell,
  BellOff,
  Plus,
  X,
  GripVertical,
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
}

interface ChecklistItem {
  text: string;
  checked: boolean;
}

type SaveStatus = "saved" | "saving" | "idle";

const TAG_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#22c55e", "#14b8a6",
  "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#6b7280",
];

function parseChecklist(content: string): ChecklistItem[] {
  return content.split("\n").map((line) => {
    const match = line.match(/^- \[([ x])\] (.*)$/);
    if (match) return { checked: match[1] === "x", text: match[2] };
    return { checked: false, text: line };
  }).filter((item) => item.text !== "" || content.split("\n").length > 1);
}

function serializeChecklist(items: ChecklistItem[]): string {
  return items.map((item) => `- [${item.checked ? "x" : " "}] ${item.text}`).join("\n");
}

export default function NoteEditorPage() {
  const params = useParams();
  const router = useRouter();
  const noteId = params.id as string;

  const [note, setNote] = useState<Note | null>(null);
  const [folders, setFolders] = useState<readonly Folder[]>([]);
  const [allTags, setAllTags] = useState<readonly TagData[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [noteType, setNoteType] = useState<string>("text");
  const [noteTags, setNoteTags] = useState<readonly TagData[]>([]);
  const [reminderAt, setReminderAt] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3b82f6");

  // Checklist state
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const newItemRef = useRef<HTMLInputElement | null>(null);

  const fetchNote = useCallback(async () => {
    try {
      const [noteRes, foldersRes, tagsRes] = await Promise.all([
        fetch(`/api/notes/${noteId}`),
        fetch("/api/folders"),
        fetch("/api/tags"),
      ]);
      if (noteRes.ok) {
        const noteData = await noteRes.json();
        const fetched = noteData.data as Note;
        setNote(fetched);
        setTitle(fetched.title);
        setContent(fetched.content);
        setNoteType(fetched.note_type || "text");
        setNoteTags(fetched.tags || []);
        setReminderAt(fetched.reminder_at);
        if (fetched.note_type === "checklist") {
          setChecklistItems(parseChecklist(fetched.content));
        }
      }
      if (foldersRes.ok) {
        const foldersData = await foldersRes.json();
        setFolders(foldersData.data ?? []);
      }
      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        setAllTags(tagsData.data ?? []);
      }
    } catch {
      // Note fetch failed
    } finally {
      setLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  const saveNote = useCallback(
    async (newTitle: string, newContent: string, extraFields?: Record<string, unknown>) => {
      setSaveStatus("saving");
      try {
        const res = await fetch(`/api/notes/${noteId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTitle, content: newContent, ...extraFields }),
        });
        if (res.ok) {
          const data = await res.json();
          setNote(data.data);
          setSaveStatus("saved");
        }
      } catch {
        setSaveStatus("idle");
      }
    },
    [noteId]
  );

  const debouncedSave = useCallback(
    (newTitle: string, newContent: string, extraFields?: Record<string, unknown>) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveNote(newTitle, newContent, extraFields);
      }, 1000);
    },
    [saveNote]
  );

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    setSaveStatus("idle");
    if (noteType === "checklist") {
      debouncedSave(newTitle, serializeChecklist(checklistItems));
    } else {
      debouncedSave(newTitle, content);
    }
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setSaveStatus("idle");
    debouncedSave(title, newContent);
  };

  const handleContentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newContent = content.slice(0, start) + "  " + content.slice(end);
      setContent(newContent);
      setSaveStatus("idle");
      debouncedSave(title, newContent);
      requestAnimationFrame(() => {
        target.selectionStart = start + 2;
        target.selectionEnd = start + 2;
      });
    }
  };

  // Checklist operations
  const updateChecklistItem = (index: number, updates: Partial<ChecklistItem>) => {
    const newItems = [...checklistItems];
    newItems[index] = { ...newItems[index], ...updates };
    setChecklistItems(newItems);
    const serialized = serializeChecklist(newItems);
    setContent(serialized);
    setSaveStatus("idle");
    debouncedSave(title, serialized);
  };

  const addChecklistItem = () => {
    const newItems = [...checklistItems, { text: "", checked: false }];
    setChecklistItems(newItems);
    const serialized = serializeChecklist(newItems);
    setContent(serialized);
    setSaveStatus("idle");
    debouncedSave(title, serialized);
    setTimeout(() => newItemRef.current?.focus(), 50);
  };

  const removeChecklistItem = (index: number) => {
    const newItems = checklistItems.filter((_, i) => i !== index);
    setChecklistItems(newItems.length > 0 ? newItems : [{ text: "", checked: false }]);
    const serialized = serializeChecklist(newItems.length > 0 ? newItems : [{ text: "", checked: false }]);
    setContent(serialized);
    setSaveStatus("idle");
    debouncedSave(title, serialized);
  };

  const handleChecklistKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const newItems = [...checklistItems];
      newItems.splice(index + 1, 0, { text: "", checked: false });
      setChecklistItems(newItems);
      const serialized = serializeChecklist(newItems);
      setContent(serialized);
      debouncedSave(title, serialized);
      setTimeout(() => {
        const inputs = document.querySelectorAll<HTMLInputElement>(".checklist-text");
        inputs[index + 1]?.focus();
      }, 50);
    }
    if (e.key === "Backspace" && checklistItems[index].text === "" && checklistItems.length > 1) {
      e.preventDefault();
      removeChecklistItem(index);
      setTimeout(() => {
        const inputs = document.querySelectorAll<HTMLInputElement>(".checklist-text");
        inputs[Math.max(0, index - 1)]?.focus();
      }, 50);
    }
  };

  // Toggle note type
  const handleToggleNoteType = async () => {
    const newType = noteType === "text" ? "checklist" : "text";
    setNoteType(newType);

    if (newType === "checklist") {
      // Convert text to checklist
      const lines = content.split("\n").filter((l) => l.trim());
      const items: ChecklistItem[] = lines.length > 0
        ? lines.map((line) => {
            const match = line.match(/^- \[([ x])\] (.*)$/);
            if (match) return { checked: match[1] === "x", text: match[2] };
            return { checked: false, text: line };
          })
        : [{ checked: false, text: "" }];
      setChecklistItems(items);
      const serialized = serializeChecklist(items);
      setContent(serialized);
      await saveNote(title, serialized, { note_type: "checklist" });
    } else {
      // Convert checklist back to text
      const text = checklistItems.map((item) => item.text).join("\n");
      setContent(text);
      await saveNote(title, text, { note_type: "text" });
    }
  };

  // Tag operations
  const handleToggleTag = async (tag: TagData) => {
    const currentIds = noteTags.map((t) => t.id);
    const newIds = currentIds.includes(tag.id)
      ? currentIds.filter((id) => id !== tag.id)
      : [...currentIds, tag.id];

    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag_ids: newIds }),
      });
      if (res.ok) {
        const data = await res.json();
        setNote(data.data);
        setNoteTags(data.data.tags || []);
      }
    } catch {}
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
      });
      if (res.ok) {
        const data = await res.json();
        const newTag = data.data as TagData;
        setAllTags([...allTags, newTag]);
        setNewTagName("");
        // Auto-add to current note
        await handleToggleTag(newTag);
      }
    } catch {}
  };

  // Reminder operations
  const handleSetReminder = async (datetime: string) => {
    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminder_at: datetime || null }),
      });
      if (res.ok) {
        const data = await res.json();
        setNote(data.data);
        setReminderAt(data.data.reminder_at);
        setShowReminderPicker(false);
      }
    } catch {}
  };

  const handleClearReminder = async () => {
    await handleSetReminder("");
  };

  const handleTogglePin = async () => {
    if (!note) return;
    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_pinned: !note.is_pinned }),
      });
      if (res.ok) {
        const data = await res.json();
        setNote(data.data);
      }
    } catch {}
  };

  const handleToggleShare = async () => {
    if (!note) return;
    try {
      const endpoint = note.share_token
        ? `/api/notes/${noteId}?action=unshare`
        : `/api/notes/${noteId}?action=share`;
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        setNote(data.data);
      }
    } catch {}
  };

  const handleFolderChange = async (folderId: string | null) => {
    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder_id: folderId }),
      });
      if (res.ok) {
        const data = await res.json();
        setNote(data.data);
      }
    } catch {}
    setShowFolderPicker(false);
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
      if (res.ok) router.replace("/");
    } catch {}
  };

  const currentFolder = folders.find((f) => f.id === note?.folder_id);
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;
  const isOverdue = reminderAt && new Date(reminderAt) < new Date();

  const formatReminderDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
      " at " +
      d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h2 className="text-xl font-semibold text-foreground mb-2">Note not found</h2>
        <Button variant="outline" onClick={() => router.push("/")}>
          Back to notes
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-4">
      {/* Header Bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="gap-1">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {/* Folder Picker */}
        <div className="relative">
          <button
            onClick={() => setShowFolderPicker((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border/60 rounded-lg hover:bg-accent/50 transition-colors"
          >
            {currentFolder ? (
              <>
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: currentFolder.color }} />
                {currentFolder.name}
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                No folder
              </>
            )}
          </button>
          {showFolderPicker && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowFolderPicker(false)} />
              <div className="absolute top-full left-0 mt-1 w-48 border border-border/60 bg-card rounded-xl shadow-lg z-20 py-1">
                <button onClick={() => handleFolderChange(null)} className="w-full text-left px-3 py-2 text-sm hover:bg-accent/50 transition-colors">
                  No folder
                </button>
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => handleFolderChange(folder.id)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent/50 transition-colors flex items-center gap-2"
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: folder.color }} />
                    {folder.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <span className="text-xs text-muted-foreground mr-2">
            {saveStatus === "saving" && "Saving..."}
            {saveStatus === "saved" && (
              <span className="inline-flex items-center gap-1 text-green-500">
                <Check className="h-3 w-3" />
                Saved
              </span>
            )}
          </span>

          <Button variant="ghost" size="sm" onClick={handleTogglePin}
            className={note.is_pinned ? "text-amber-500" : "text-muted-foreground"}>
            <Pin className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleToggleShare}
            className={note.share_token ? "text-blue-500" : "text-muted-foreground"}>
            <Share2 className="h-4 w-4" />
          </Button>

          {showDeleteConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-destructive">Delete?</span>
              <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive">Yes</Button>
              <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>No</Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(true)} className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Title Input */}
      <input
        type="text"
        value={title}
        onChange={(e) => handleTitleChange(e.target.value)}
        placeholder="Untitled"
        className="w-full text-3xl font-bold border-none bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none mb-2"
      />

      {/* Tags Row */}
      {noteTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {noteTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: `${tag.color}18`, color: tag.color }}
            >
              {tag.name}
              <button onClick={() => handleToggleTag(tag)} className="hover:opacity-70">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Reminder Badge */}
      {reminderAt && (
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-3 ${
          isOverdue ? "reminder-overdue" : "reminder-upcoming"
        }`}>
          <Bell className="h-3 w-3" />
          {formatReminderDate(reminderAt)}
          <button onClick={handleClearReminder} className="hover:opacity-70 ml-1">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Editor Toolbar */}
      <div className="flex items-center gap-1 mb-4 pb-3 border-b border-border/40">
        {/* Note type toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleNoteType}
          className={`gap-1.5 text-xs ${noteType === "checklist" ? "text-blue-500" : "text-muted-foreground"}`}
          title={noteType === "checklist" ? "Switch to text" : "Switch to checklist"}
        >
          {noteType === "checklist" ? <Type className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
          {noteType === "checklist" ? "Text mode" : "Checklist"}
        </Button>

        {/* Tag picker */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTagPicker((p) => !p)}
            className="gap-1.5 text-xs text-muted-foreground"
          >
            <Tag className="h-4 w-4" />
            Tags
          </Button>
          {showTagPicker && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowTagPicker(false)} />
              <div className="absolute top-full left-0 mt-1 w-56 border border-border/60 bg-card rounded-xl shadow-lg z-20 py-1 tag-picker-dropdown">
                {allTags.map((tag) => {
                  const isActive = noteTags.some((t) => t.id === tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => handleToggleTag(tag)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent/50 transition-colors flex items-center gap-2"
                    >
                      <span className="h-3 w-3 rounded-full border-2 flex items-center justify-center"
                        style={{ borderColor: tag.color, backgroundColor: isActive ? tag.color : "transparent" }}>
                        {isActive && <Check className="h-2 w-2 text-white" />}
                      </span>
                      <span style={{ color: tag.color }}>{tag.name}</span>
                    </button>
                  );
                })}
                <div className="border-t border-border/40 mt-1 pt-1 px-3 py-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="New tag..."
                      className="flex-1 text-sm bg-transparent border-none focus:outline-none text-foreground placeholder:text-muted-foreground"
                      onKeyDown={(e) => { if (e.key === "Enter") handleCreateTag(); }}
                    />
                    <div className="flex items-center gap-1">
                      {TAG_COLORS.slice(0, 5).map((c) => (
                        <button
                          key={c}
                          onClick={() => setNewTagColor(c)}
                          className="h-4 w-4 rounded-full border border-border/60"
                          style={{ backgroundColor: c, outline: newTagColor === c ? "2px solid var(--ring)" : "none", outlineOffset: "1px" }}
                        />
                      ))}
                    </div>
                    <button onClick={handleCreateTag} className="text-muted-foreground hover:text-foreground">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Reminder picker */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReminderPicker((p) => !p)}
            className={`gap-1.5 text-xs ${reminderAt ? "text-blue-500" : "text-muted-foreground"}`}
          >
            {reminderAt ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            {reminderAt ? "Edit reminder" : "Reminder"}
          </Button>
          {showReminderPicker && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowReminderPicker(false)} />
              <div className="absolute top-full left-0 mt-1 border border-border/60 bg-card rounded-xl shadow-lg z-20 p-3">
                <label className="text-xs text-muted-foreground block mb-1.5">Set reminder</label>
                <input
                  type="datetime-local"
                  defaultValue={reminderAt ? new Date(new Date(reminderAt).getTime() - new Date(reminderAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""}
                  onChange={(e) => {
                    if (e.target.value) handleSetReminder(new Date(e.target.value).toISOString());
                  }}
                  className="text-sm border border-border/60 rounded-lg bg-card/50 text-foreground px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
                />
                {reminderAt && (
                  <button
                    onClick={handleClearReminder}
                    className="block mt-2 text-xs text-destructive hover:underline"
                  >
                    Remove reminder
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 ml-auto text-xs text-muted-foreground">
          <span>{wordCount} {wordCount === 1 ? "word" : "words"}</span>
          <span>{charCount} {charCount === 1 ? "char" : "chars"}</span>
        </div>
      </div>

      {/* Content Editor */}
      {noteType === "checklist" ? (
        <div className="min-h-[50vh] space-y-0.5">
          {checklistItems.map((item, index) => (
            <div key={index} className={`checklist-item ${item.checked ? "completed" : ""}`}>
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) => updateChecklistItem(index, { checked: e.target.checked })}
              />
              <input
                type="text"
                value={item.text}
                onChange={(e) => updateChecklistItem(index, { text: e.target.value })}
                onKeyDown={(e) => handleChecklistKeyDown(e, index)}
                placeholder={index === 0 ? "List item" : ""}
                className="checklist-text"
                ref={index === checklistItems.length - 1 ? newItemRef : undefined}
              />
              {checklistItems.length > 1 && (
                <button
                  onClick={() => removeChecklistItem(index)}
                  className="text-muted-foreground/50 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                  style={{ opacity: undefined }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = "0.3"}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addChecklistItem}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2 px-1"
          >
            <Plus className="h-4 w-4" />
            Add item
          </button>
        </div>
      ) : (
        <textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          onKeyDown={handleContentKeyDown}
          placeholder="Start writing..."
          className="w-full min-h-[50vh] text-sm bg-transparent text-foreground placeholder:text-muted-foreground/50 border-none focus:outline-none resize-none leading-relaxed"
        />
      )}
    </div>
  );
}
