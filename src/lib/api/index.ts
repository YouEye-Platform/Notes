/**
 * @youeye/canvas/api — YouEye platform API client
 *
 * Service-to-service client for YE-UI's internal API.
 * All requests go through the Incus bridge network.
 *
 * Usage:
 *   import { createApiClient } from "@youeye/canvas/api";
 *   const api = createApiClient("ye-cinema");
 *   const config = await api.fetchHeaderConfig(userId);
 */

import type { HeaderConfig, LaunchRequirements } from "../types";

function getYouEyeApiUrl(): string {
  if (process.env.YOUEYE_API_URL) return process.env.YOUEYE_API_URL;
  if (process.env.YOUEYE_GATEWAY) {
    const gw = process.env.YOUEYE_GATEWAY;
    const base = gw.replace(/\/api\/apps\/v\d+$/, "");
    return `${base}/api/v1`;
  }
  throw new Error("Neither YOUEYE_API_URL nor YOUEYE_GATEWAY is set.");
}

export interface YouEyeApiClient {
  /** Fetch header config (branding, apps, notifications, theme) */
  fetchHeaderConfig(userId?: string): Promise<HeaderConfig | null>;
  /** Fetch user notifications */
  fetchNotifications(userId: string, limit?: number): Promise<{ notifications: unknown[]; unread_count: number } | null>;
  /** Get user settings for this app */
  getUserSettings(userId: string): Promise<Record<string, unknown>>;
  /** Save user settings for this app */
  saveUserSettings(userId: string, settings: Record<string, unknown>): Promise<boolean>;
  /** Sync theme mode to YE-UI */
  syncThemeMode(userId: string, mode: string): Promise<boolean>;
  /** Post a timeline entry */
  postTimelineEntry(userId: string, collection: string, data: Record<string, unknown>): Promise<void>;
  /** Resolve manifest-declared first-launch permission requirements */
  getLaunchRequirements(userId: string, returnTo?: string): Promise<LaunchRequirements | null>;
  /** Raw fetch against the YE-UI API */
  fetch(path: string, options?: RequestInit, userId?: string): Promise<Response>;
}

export function createApiClient(appId: string): YouEyeApiClient {
  const platformAppId = process.env.YOUEYE_APP_ID || appId.replace(/^ye-/, "");

  async function youeyeFetch(path: string, options: RequestInit = {}, userId?: string): Promise<Response> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-YouEye-App": platformAppId,
      ...(options.headers as Record<string, string>),
    };
    if (userId) headers["X-YouEye-User"] = userId;
    const appToken = process.env.YOUEYE_APP_TOKEN;
    if (appToken) headers["Authorization"] = `Bearer ${appToken}`;
    return fetch(`${getYouEyeApiUrl()}${path}`, { ...options, headers });
  }

  return {
    async fetchHeaderConfig(userId?: string): Promise<HeaderConfig | null> {
      try {
        const res = await youeyeFetch("/header/config", { next: { revalidate: 0 } } as RequestInit, userId);
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },

    async fetchNotifications(userId: string, limit = 20) {
      try {
        const res = await youeyeFetch(`/notifications?limit=${limit}`, {}, userId);
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },

    async getUserSettings(userId: string): Promise<Record<string, unknown>> {
      try {
        const res = await youeyeFetch(`/apps/${encodeURIComponent(platformAppId)}/user-settings`, {}, userId);
        if (!res.ok) return {};
        const data = await res.json();
        return data.settings ?? {};
      } catch {
        return {};
      }
    },

    async saveUserSettings(userId: string, settings: Record<string, unknown>): Promise<boolean> {
      try {
        const res = await youeyeFetch(`/apps/${encodeURIComponent(platformAppId)}/user-settings`, { method: "PUT", body: JSON.stringify({ settings }) }, userId);
        return res.ok;
      } catch {
        return false;
      }
    },

    async syncThemeMode(userId: string, mode: string): Promise<boolean> {
      try {
        const res = await youeyeFetch("/themes/active", { method: "PUT", body: JSON.stringify({ mode }) }, userId);
        return res.ok;
      } catch {
        return false;
      }
    },

    async postTimelineEntry(userId: string, collection: string, data: Record<string, unknown>) {
      try {
        await youeyeFetch("/timeline", { method: "POST", body: JSON.stringify({ ...data, collection }) }, userId);
      } catch {
        // Non-critical — timeline is best-effort
      }
    },

    async getLaunchRequirements(userId: string, returnTo?: string): Promise<LaunchRequirements | null> {
      try {
        const query = returnTo ? `?return_to=${encodeURIComponent(returnTo)}` : "";
        const res = await youeyeFetch(`/apps/${encodeURIComponent(platformAppId)}/launch-requirements${query}`, {}, userId);
        if (!res.ok && res.status !== 202) return null;
        return await res.json();
      } catch {
        return null;
      }
    },

    fetch: youeyeFetch,
  };
}
