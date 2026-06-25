/**
 * @youeye/canvas/routes/auth — SSO route handlers
 *
 * Usage in your app:
 *   // src/app/api/auth/sso/route.ts
 *   export { GET } from "@youeye/canvas/routes/auth";
 *
 *   // src/app/api/auth/callback/route.ts
 *   export { GET } from "@youeye/canvas/routes/auth/callback";
 *
 * OR use the factory functions for customization:
 *   import { createSSOHandler, createCallbackHandler, createLogoutHandler } from "@youeye/canvas/routes/auth";
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getOAuthConfig,
  buildAuthorizeUrl,
  exchangeCodeForToken,
  fetchUserInfo,
  generateOAuthState,
} from "../../auth/identity";
import { createSession, getSessionCookieName } from "../../auth/session";

interface AuthRouteConfig {
  /** App ID, e.g. "ye-cinema" */
  appId: string;
  /** Env var name for the external URL, e.g. "CINEMA_EXTERNAL_URL" */
  externalUrlEnv: string;
}

function externalBaseUrl(request: NextRequest, envName: string): string {
  const configured = process.env[envName] || process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "";
  if (configured) return configured.replace(/\/$/, "");

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.replace(/:$/, "") || "https";
  if (host && !host.includes("0.0.0.0")) return `${proto}://${host}`;

  return `${request.nextUrl.protocol}//${request.nextUrl.host}`;
}

/** Creates GET /api/auth/sso handler */
export function createSSOHandler(config: AuthRouteConfig) {
  return async function GET(request: NextRequest) {
    const oauthConfig = getOAuthConfig();
    if (!oauthConfig) return NextResponse.json({ error: "SSO not configured" }, { status: 503 });

    const state = generateOAuthState();
    const externalUrl = externalBaseUrl(request, config.externalUrlEnv);
    const redirectUri = `${externalUrl}/api/auth/callback`;
    const authorizeUrl = buildAuthorizeUrl(oauthConfig, redirectUri, state);

    const response = NextResponse.redirect(authorizeUrl);
    response.cookies.set(`${config.appId}-oauth-state`, state, {
      httpOnly: true,
      secure: process.env.SECURE_COOKIES !== "false",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });

    // Store the post-login redirect destination (e.g. /embed/settings)
    const postLoginRedirect = request.nextUrl.searchParams.get("redirect");
    if (postLoginRedirect && postLoginRedirect.startsWith("/") && !postLoginRedirect.startsWith("//")) {
      response.cookies.set(`${config.appId}-oauth-redirect`, postLoginRedirect, {
        httpOnly: true,
        secure: process.env.SECURE_COOKIES !== "false",
        sameSite: "lax",
        maxAge: 600,
        path: "/",
      });
    }
    return response;
  };
}

/** Creates GET /api/auth/callback handler */
export function createCallbackHandler(config: AuthRouteConfig) {
  return async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const storedState = request.cookies.get(`${config.appId}-oauth-state`)?.value;

    const externalUrl = externalBaseUrl(request, config.externalUrlEnv);
    const ssoRedirect = `${externalUrl}/api/auth/sso`;

    if (!code || !state || state !== storedState) return NextResponse.redirect(ssoRedirect);

    const oauthConfig = getOAuthConfig();
    if (!oauthConfig) return NextResponse.json({ error: "SSO not configured" }, { status: 503 });

    const redirectUri = `${externalUrl}/api/auth/callback`;

    const tokenData = await exchangeCodeForToken(oauthConfig, code, redirectUri);
    if (!tokenData) return NextResponse.redirect(ssoRedirect);

    const userInfo = await fetchUserInfo(oauthConfig, tokenData.access_token);
    if (!userInfo) return NextResponse.redirect(ssoRedirect);

    const isAdmin = (userInfo.groups || []).some((g: string) => g.toLowerCase().includes("admin"));
    const sessionToken = await createSession({
      userId: userInfo.sub,
      username: userInfo.preferred_username || userInfo.name || "user",
      name: userInfo.name || userInfo.preferred_username || "User",
      email: userInfo.email || "",
      isAdmin,
      groups: userInfo.groups || [],
    });

    // Read the post-login redirect destination (stored by SSO handler)
    const postLoginRedirect = request.cookies.get(`${config.appId}-oauth-redirect`)?.value;
    const redirectTo = postLoginRedirect && postLoginRedirect.startsWith("/") && !postLoginRedirect.startsWith("//")
      ? `${externalUrl}${postLoginRedirect}`
      : `${externalUrl}/`;
    const response = NextResponse.redirect(redirectTo);
    response.cookies.set(getSessionCookieName(), sessionToken, {
      httpOnly: true,
      secure: process.env.SECURE_COOKIES !== "false",
      sameSite: "lax",
      maxAge: 86400,
      path: "/",
    });
    response.cookies.delete(`${config.appId}-oauth-state`);
    response.cookies.delete(`${config.appId}-oauth-redirect`);
    return response;
  };
}

/** Creates POST /api/auth/logout handler */
export function createLogoutHandler(config: AuthRouteConfig) {
  return async function POST() {
    const ssoSlug = config.appId;
    const identityUrl = process.env.IDENTITY_URL || "";
    const uiUrl =
      process.env.YOUEYE_UI_URL ||
      `https://${(process.env[config.externalUrlEnv] || "").split(".").slice(1).join(".")}`;
    const endSessionUrl = `${identityUrl}/application/o/${ssoSlug}/end-session/?post_logout_redirect_uri=${encodeURIComponent(uiUrl)}`;

    const response = NextResponse.json({ ok: true, redirect: endSessionUrl });
    response.cookies.delete(getSessionCookieName());

    const domain = extractParentDomain(process.env[config.externalUrlEnv] || process.env.NEXT_PUBLIC_APP_URL || "");
    if (domain) {
      response.cookies.set("ye-logout-ts", String(Date.now()), {
        domain: `.${domain}`,
        path: "/",
        httpOnly: false,
        sameSite: "lax",
        secure: process.env.SECURE_COOKIES !== "false",
        maxAge: 300,
      });
    }

    return response;
  };
}

function extractParentDomain(url: string): string | null {
  try {
    const hostname = url.includes("://") ? new URL(url).hostname : url;
    const parts = hostname.split(".");
    return parts.length >= 2 ? parts.slice(-parts.length + 1).join(".") : null;
  } catch {
    return null;
  }
}
