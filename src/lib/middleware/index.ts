/**
 * @youeye/canvas/middleware — Next.js auth guard middleware factory
 *
 * Usage in your app's middleware.ts:
 *
 *   import { createCanvasMiddleware } from "@youeye/canvas/middleware";
 *   export const middleware = createCanvasMiddleware({
 *     appId: "ye-cinema",
 *     publicRoutes: ["/shared/", "/embed/"],
 *   });
 *   export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|icons).*)"] };
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

/** Default public routes — every Canvas app gets these for free */
const DEFAULT_PUBLIC_ROUTES = [
  "/api/auth/sso",
  "/api/auth/callback",
  "/api/auth/logout",
  "/api/health",
  "/api/manifest",
  "/api/widgets/",
  "/api/cards/",
  "/api/inter-app/",
];

const STATIC_PATTERNS = ["/_next/", "/favicon.ico", "/icons/", "/sw.js", "/serwist-", "/manifest.webmanifest", "/offline"];

function externalBaseUrl(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "";
  if (configured) return configured.replace(/\/$/, "");

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.replace(/:$/, "") || "https";
  if (host && !host.includes("0.0.0.0")) return `${proto}://${host}`;

  return `${request.nextUrl.protocol}//${request.nextUrl.host}`;
}

interface MiddlewareConfig {
  /** App ID, e.g. "ye-cinema" — used to derive cookie name */
  appId: string;
  /** Additional public routes beyond platform defaults */
  publicRoutes?: string[];
}

function getJWTSecret(): Uint8Array | null {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) return null;
  return new TextEncoder().encode(secret);
}

export function createCanvasMiddleware(config: MiddlewareConfig) {
  const cookieName = config.appId.startsWith("ye-") ? `${config.appId}-session` : `ye-${config.appId}-session`;
  const publicRoutes = [...DEFAULT_PUBLIC_ROUTES, ...(config.publicRoutes ?? [])];

  return async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip static resources
    if (STATIC_PATTERNS.some((p) => pathname.startsWith(p))) {
      return NextResponse.next();
    }

    // Allow public routes
    if (publicRoutes.some((r) => pathname === r || pathname.startsWith(r))) {
      return NextResponse.next();
    }

    // Check session cookie
    const sessionCookie = request.cookies.get(cookieName);

    if (!sessionCookie?.value) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      // Preserve the original URL so we can redirect back after SSO
      const returnTo = request.nextUrl.pathname + request.nextUrl.search;
      const ssoUrl = new URL(`${externalBaseUrl(request)}/api/auth/sso`);
      ssoUrl.searchParams.set("redirect", returnTo);
      return NextResponse.redirect(ssoUrl);
    }

    // Verify JWT
    const secret = getJWTSecret();
    if (!secret) {
      return NextResponse.next();
    }

    try {
      const { payload } = await jwtVerify(sessionCookie.value, secret);

      // Cross-app logout signal check
      const logoutTs = request.cookies.get("ye-logout-ts");
      if (logoutTs?.value) {
        const issuedAt = typeof payload.iat === "number" ? payload.iat * 1000 : 0;
        const logoutTime = Number(logoutTs.value);
        if (logoutTime > issuedAt) {
          const response = pathname.startsWith("/api/")
            ? NextResponse.json({ error: "Session expired" }, { status: 401 })
            : NextResponse.redirect(`${externalBaseUrl(request)}/api/auth/sso`);
          response.cookies.delete(cookieName);
          return response;
        }
      }

      return NextResponse.next();
    } catch {
      const response = pathname.startsWith("/api/")
        ? NextResponse.json({ error: "Session expired" }, { status: 401 })
        : NextResponse.redirect(`${externalBaseUrl(request)}/api/auth/sso`);

      response.cookies.delete(cookieName);
      return response;
    }
  };
}

/** Standard middleware matcher config — use this in your middleware.ts export */
export const canvasMiddlewareConfig = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons).*)"],
};
