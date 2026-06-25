import { getMany, query } from "@/lib/db/client";
import { runMigrations } from "@/lib/db/migrate";
import { createApiClient } from "@/lib/api";

const api = createApiClient("ye-notes");

interface DueReminder {
  id: string;
  title: string;
  user_id: string;
  reminder_at: string;
}

async function checkAndFireReminders(): Promise<number> {
  try {
    await runMigrations();

    const due = await getMany(
      `SELECT id, title, user_id, reminder_at
       FROM notes
       WHERE reminder_at <= NOW()
         AND reminder_sent = false
         AND reminder_at IS NOT NULL`,
      []
    ) as unknown as DueReminder[];

    if (due.length === 0) return 0;

    const externalUrl = process.env.NOTES_EXTERNAL_URL || "";
    let sent = 0;

    for (const note of due) {
      try {
        const res = await api.fetch("/notifications", {
          method: "POST",
          body: JSON.stringify({
            title: `Reminder: ${note.title || "Untitled Note"}`,
            message: "Your note reminder is now due.",
            type: "info",
            user_id: note.user_id,
            action: externalUrl ? { url: `${externalUrl}/notes/${note.id}` } : undefined,
          }),
        }, note.user_id);

        if (res.ok) {
          await query(
            "UPDATE notes SET reminder_sent = true WHERE id = $1",
            [note.id]
          );
          sent++;
        }
      } catch {
        // Individual notification failure is non-critical
      }
    }

    if (sent > 0) {
      console.log(`[reminders] Fired ${sent} reminder notification(s)`);
    }
    return sent;
  } catch (err) {
    console.error("[reminders] Check failed:", err);
    return 0;
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startReminderChecker(): void {
  if (intervalId) return;
  // Initial check after 10s (let the app fully boot)
  setTimeout(() => {
    checkAndFireReminders();
    intervalId = setInterval(checkAndFireReminders, 60_000);
  }, 10_000);
  console.log("[reminders] Checker scheduled (60s interval)");
}
