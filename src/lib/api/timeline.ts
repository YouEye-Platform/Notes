type PlatformFetch = (path: string, options?: RequestInit, userId?: string) => Promise<Response>;
/** No payload leaves this process without a fresh, account-bound collection interval.
 * Never cache consent, queue a failed event or retry it after re-enable.
 */
export async function postAdmittedTimeline(fetchPlatform: PlatformFetch, userId: string, collection: string, data: Record<string, unknown>): Promise<void> {
  const capturedAt = typeof data.timestamp === "string" ? data.timestamp : new Date().toISOString();
  try {
    const response = await fetchPlatform("/timeline/collection", { cache: "no-store" }, userId);
    if (!response.ok) return;
    const state = await response.json();
    if (state.enabled !== true || typeof state.revision !== "string" || !/^[0-9a-f-]{36}$/.test(state.revision)) return;
    const started = Date.parse(state.enabledAt);
    const time = Date.parse(capturedAt);
    if (!Number.isFinite(started) || !Number.isFinite(time) || time < started) return;
    await fetchPlatform("/timeline", {
      method: "POST", body: JSON.stringify({ ...data, timestamp: capturedAt, collection, collection_revision: state.revision }),
    }, userId);
  } catch {
    // Collection is optional. Missing state never becomes implicit consent.
  }
}
