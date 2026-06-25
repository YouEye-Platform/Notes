/**
 * @youeye/canvas/auth — identity OAuth2 + JWT session management
 *
 * Usage:
 *   import { getOAuthConfig, getSession, createSession } from "@youeye/canvas/auth";
 */

export { getOAuthConfig, buildAuthorizeUrl, exchangeCodeForToken, fetchUserInfo, generateOAuthState, isSSOConfigured } from "./identity";
export { createSession, verifySession, getSession, getJWTSecretKey, getSessionCookieName, initSession } from "./session";
