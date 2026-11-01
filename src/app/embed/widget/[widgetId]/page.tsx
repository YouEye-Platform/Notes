import { getLocale } from "next-intl/server";
import { useTranslations as useInterfaceTranslations } from "next-intl";
import { getTranslations as getInterfaceTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth";
import { getMany, getOne } from "@/lib/db/client";
import { runMigrations } from "@/lib/db/migrate";
import { StickyNote, Pin, Bell, CheckSquare } from "lucide-react";
import QuickCaptureWidget from "./quick-capture";

interface WidgetPageProps {
  params: Promise<{ widgetId: string }>;
}

function SignInPrompt() {
  const translateInterface = useInterfaceTranslations("interface");

  return (
    <div className="p-3 text-sm text-muted-foreground">
      {translateInterface("m557f00214077")}</div>
  );
}

/* ─── Recent Notes Widget (redesigned) ─── */
async function RecentNotesWidget() {
  const locale = await getLocale();
  const translateInterface = await getInterfaceTranslations("interface");

  const session = await getSession().catch(() => null);
  if (!session) return <SignInPrompt />;

  try {
    await runMigrations();
    const notes = await getMany(
      `SELECT id, title, LEFT(content, 80) as preview, is_pinned, reminder_at, note_type, updated_at
       FROM notes WHERE user_id = $1
       ORDER BY updated_at DESC LIMIT 5`,
      [session.userId]
    );

    const externalUrl = process.env.NOTES_EXTERNAL_URL || "";

    if (notes.length === 0) {
      return (
        <div className="h-full p-2">
          <div className="h-full rounded-xl bg-card/50 backdrop-blur-md border border-border/20 p-3 flex flex-col items-center justify-center text-center">
            <StickyNote className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">{translateInterface("ma092ad6b8be0")}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full p-2">
        <div className="h-full rounded-xl bg-card/50 backdrop-blur-md border border-border/20 p-3 space-y-1">
          <h3 className="text-sm font-semibold mb-1">{translateInterface("m632c3623694b")}</h3>
          <ul className="space-y-0.5">
            {notes.map((note: Record<string, unknown>) => {
              const title = (note.title as string) || translateInterface("mf59ab8d1331b");
              const updatedAt = note.updated_at
                ? formatRelativeTime(note.updated_at as string, locale)
                : "";
              const noteUrl = `${externalUrl}/notes/${note.id}`;
              const isPinned = note.is_pinned as boolean;
              const hasReminder = !!note.reminder_at;
              const isChecklist = note.note_type === "checklist";

              return (
                <li key={note.id as string}>
                  <a
                    href={noteUrl}
                    target="_top"
                    className="flex items-center gap-2 hover:bg-muted/50 rounded-lg p-1.5 -mx-1 transition-colors"
                  >
                    <span className="shrink-0">
                      {isPinned ? (
                        <Pin className="h-3.5 w-3.5 text-amber-500" />
                      ) : hasReminder ? (
                        <Bell className="h-3.5 w-3.5 text-blue-500" />
                      ) : isChecklist ? (
                        <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </span>
                    <span className="text-xs font-medium truncate flex-1">{title}</span>
                    <span className="text-[10px] text-muted-foreground/70 shrink-0">{updatedAt}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );
  } catch {
    return <div className="p-3 text-sm text-muted-foreground">{translateInterface("m96114cc803b5")}</div>;
  }
}

/* ─── Pinned Notes Widget ─── */
async function PinnedNotesWidget() {
  const translateInterface = await getInterfaceTranslations("interface");

  const session = await getSession().catch(() => null);
  if (!session) return <SignInPrompt />;

  try {
    await runMigrations();
    const notes = await getMany(
      `SELECT id, title, LEFT(content, 60) as preview, note_type
       FROM notes WHERE user_id = $1 AND is_pinned = true
       ORDER BY updated_at DESC LIMIT 3`,
      [session.userId]
    );

    const externalUrl = process.env.NOTES_EXTERNAL_URL || "";

    if (notes.length === 0) {
      return (
        <div className="h-full p-2">
          <div className="h-full rounded-xl bg-card/50 backdrop-blur-md border border-border/20 p-3 flex flex-col items-center justify-center text-center">
            <Pin className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">{translateInterface("m1d9e1c0da4b4")}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full p-2">
        <div className="h-full rounded-xl bg-card/50 backdrop-blur-md border border-border/20 p-3 space-y-2">
          <h3 className="text-sm font-semibold">{translateInterface("m34bc0f5cfa7a")}</h3>
          <div className="space-y-1.5">
            {notes.map((note: Record<string, unknown>) => {
              const title = (note.title as string) || translateInterface("mf59ab8d1331b");
              const preview = (note.preview as string) || "";
              const cleanPreview = preview.replace(/^- \[[ x]\] /gm, "").slice(0, 50);
              const noteUrl = `${externalUrl}/notes/${note.id}`;

              return (
                <a
                  key={note.id as string}
                  href={noteUrl}
                  target="_top"
                  className="block rounded-lg border border-border/30 p-2 hover:bg-muted/50 transition-colors"
                >
                  <div className="text-xs font-medium truncate">{title}</div>
                  {cleanPreview && (
                    <div className="text-[10px] text-muted-foreground truncate mt-0.5">{cleanPreview}</div>
                  )}
                </a>
              );
            })}
          </div>
        </div>
      </div>
    );
  } catch {
    return <div className="p-3 text-sm text-muted-foreground">{translateInterface("md387c1b63028")}</div>;
  }
}

/* ─── Note Stats Widget ─── */
async function NoteStatsWidget() {
  const translateInterface = await getInterfaceTranslations("interface");

  const session = await getSession().catch(() => null);
  if (!session) return <SignInPrompt />;

  try {
    await runMigrations();
    const [totalRes, foldersRes, pinnedRes, remindersRes] = await Promise.all([
      getOne("SELECT COUNT(*)::int as count FROM notes WHERE user_id = $1", [session.userId]),
      getOne("SELECT COUNT(*)::int as count FROM folders WHERE user_id = $1", [session.userId]),
      getOne("SELECT COUNT(*)::int as count FROM notes WHERE user_id = $1 AND is_pinned = true", [session.userId]),
      getOne("SELECT COUNT(*)::int as count FROM notes WHERE user_id = $1 AND reminder_at IS NOT NULL AND reminder_sent = false", [session.userId]),
    ]);

    const stats = [
      { label: translateInterface("m8a7525b1492f"), value: (totalRes as { count: number })?.count ?? 0, color: "text-foreground" },
      { label: translateInterface("mc4d6bb200f4c"), value: (foldersRes as { count: number })?.count ?? 0, color: "text-blue-500" },
      { label: translateInterface("mf20c87946555"), value: (pinnedRes as { count: number })?.count ?? 0, color: "text-amber-500" },
      { label: translateInterface("m7971dd752669"), value: (remindersRes as { count: number })?.count ?? 0, color: "text-green-500" },
    ];

    return (
      <div className="h-full p-2">
        <div className="h-full rounded-xl bg-card/50 backdrop-blur-md border border-border/20 p-3">
          <h3 className="text-sm font-semibold mb-2">{translateInterface("m04f9ba914429")}</h3>
          <div className="grid grid-cols-2 gap-2">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-lg bg-muted/30 p-2 text-center">
                <div className={`text-2xl font-bold tabular-nums ${stat.color}`}>{stat.value}</div>
                <div className="text-[10px] text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  } catch {
    return <div className="p-3 text-sm text-muted-foreground">{translateInterface("ma6e46f04c9bc")}</div>;
  }
}

/* ─── Helper ─── */
function formatRelativeTime(dateStr: string, locale: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });
  if (diffMins < 1) return relative.format(0, "second");
  if (diffMins < 60) return relative.format(-diffMins, "minute");
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return relative.format(-diffHours, "hour");
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return relative.format(-diffDays, "day");
  return date.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

/* ─── Unknown widget fallback ─── */
function UnknownWidget({ widgetId }: { widgetId: string }) {
  const translateInterface = useInterfaceTranslations("interface");

  return (
    <div className="p-3 text-sm text-muted-foreground">
      {translateInterface("m05ac5fdd1798")}{" "}{widgetId}
    </div>
  );
}

/* ─── Main Router ─── */
export default async function WidgetPage({ params }: WidgetPageProps) {
  const { widgetId } = await params;

  switch (widgetId) {
    case "recent-notes":
      return <RecentNotesWidget />;
    case "quick-capture":
      return <QuickCaptureWidget />;
    case "pinned-notes":
      return <PinnedNotesWidget />;
    case "note-stats":
      return <NoteStatsWidget />;
    default:
      return <UnknownWidget widgetId={widgetId} />;
  }
}
