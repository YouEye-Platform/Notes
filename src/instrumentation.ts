export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startReminderChecker } = await import("@/lib/reminders/checker");
    startReminderChecker();
  }
}
