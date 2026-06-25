/**
 * JWT Session management — configurable cookie name per app.
 *
 * Call initSession(appId) once at app startup (or on first use).
 * The cookie name becomes `ye-{appId}-session`.
 */

import { cookies } from "next/headers";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { SessionPayload } from "../types";

const SESSION_DURATION = 60 * 60 * 24; // 24 hours

let _appId = "";
let _cookieName = "";
let _jwtSecretCached: Uint8Array | null = null;

/** Initialize the session module with the app ID. Call once per context. */
export function initSession(appId: string): void {
  _appId = appId;
  // Avoid double-prefixing: "ye-wiki" → "ye-wiki-session", not "ye-ye-wiki-session"
  _cookieName = appId.startsWith("ye-") ? `${appId}-session` : `ye-${appId}-session`;
}

/** Derive cookie name — uses initSession value, falls back to YOUEYE_APP_ID env var */
function resolveCookieName(): string {
  if (_cookieName) return _cookieName;
  const envAppId = process.env.YOUEYE_APP_ID;
  if (envAppId) {
    initSession(envAppId);
    return _cookieName;
  }
  return "ye-app-session";
}

export function getSessionCookieName(): string {
  return resolveCookieName();
}

function getJWTSecret(): Uint8Array {
  if (_jwtSecretCached) return _jwtSecretCached;
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is required.");
  if (secret.length < 32) throw new Error("JWT_SECRET must be at least 32 characters.");
  _jwtSecretCached = new TextEncoder().encode(secret);
  return _jwtSecretCached;
}

export function getJWTSecretKey(): Uint8Array | null {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) return null;
  return new TextEncoder().encode(secret);
}

export async function createSession(payload: {
  userId: string;
  username: string;
  name: string;
  email: string;
  isAdmin: boolean;
  groups: string[];
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_DURATION)
    .sign(getJWTSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJWTSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Read the current session from cookies.
 *
 * @param appId — optional app ID override. When called from a server
 *   component or route handler (Node.js runtime), the module-level
 *   `_cookieName` set by `initSession()` in middleware (Edge runtime)
 *   may be empty because the two runtimes don't share module state.
 *   Passing `appId` here guarantees the correct cookie is read without
 *   depending on cross-runtime global state.
 */
export async function getSession(appId?: string): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  let name: string;
  if (appId) {
    name = appId.startsWith("ye-") ? `${appId}-session` : `ye-${appId}-session`;
  } else {
    name = resolveCookieName();
  }
  const sessionCookie = cookieStore.get(name);
  if (!sessionCookie?.value) return null;
  return verifySession(sessionCookie.value);
}
