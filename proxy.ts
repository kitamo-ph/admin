import { type NextRequest, NextResponse } from "next/server";

import { hasPermission } from "@/lib/auth/authorization";
import {
  ACCESS_COOKIE,
  IDLE_MS,
  REFRESH_COOKIE,
  REFRESH_COOKIE_MAX_AGE_S,
  SEEN_COOKIE,
  SESSION_COOKIES,
  accessCookieMaxAge,
  cookieOptions,
  idleExpired,
  needsRefresh,
  refreshSession,
  signOutSession,
} from "@/lib/auth/kitamo/session";
import {
  isMfaPath,
  isProtectedAdminPath,
  permissionForAdminPath,
} from "@/lib/auth/routes";
import {
  DEVELOPMENT_ADMIN_ROLE_COOKIE,
  sessionFromDevelopmentRole,
} from "@/lib/auth/session";

/**
 * Defense in depth only; the security boundary is the server (each page
 * resolves the session: the ES256 check, aal2, then Core's km_admin_session).
 *
 * A KitaMo session (R16, copied from Operations' console proxy at dbe4ca6):
 * 30 minutes idle signs out; a token near its end is refreshed; each page
 * view or form post counts as activity. The development role cookie keeps
 * the mock beta's route checks (development and test only).
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;
  const mfa = isMfaPath(pathname);

  if (!mfa && !isProtectedAdminPath(pathname)) {
    return NextResponse.next();
  }

  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  if (access !== undefined && refresh !== undefined) {
    return kitamoSession(request, access, refresh);
  }

  const session = sessionFromDevelopmentRole(
    request.cookies.get(DEVELOPMENT_ADMIN_ROLE_COOKIE)?.value,
  );

  if (!session || mfa) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("returnTo", `${pathname}${search}`);
    return NextResponse.redirect(signInUrl);
  }

  const permission = permissionForAdminPath(pathname);
  if (permission && !hasPermission(session.role, permission)) {
    return NextResponse.redirect(new URL("/access-denied", request.url));
  }

  return NextResponse.next();
}

async function kitamoSession(
  request: NextRequest,
  access: string,
  refresh: string,
): Promise<NextResponse> {
  const now = Date.now();
  if (idleExpired(request.cookies.get(SEEN_COOKIE)?.value, now)) {
    await signOutSession(access);
    return toSignIn(request, "idle");
  }
  let renewed = null;
  if (needsRefresh(access, now)) {
    renewed = await refreshSession(refresh);
    if (renewed === null) return toSignIn(request, "expired");
    request.cookies.set(ACCESS_COOKIE, renewed.access_token);
    request.cookies.set(REFRESH_COOKIE, renewed.refresh_token);
  }
  const response = NextResponse.next({ request: { headers: request.headers } });
  response.headers.set("cache-control", "private, no-store");
  if (renewed !== null) {
    response.cookies.set(
      ACCESS_COOKIE,
      renewed.access_token,
      cookieOptions(accessCookieMaxAge(renewed, now)),
    );
    response.cookies.set(
      REFRESH_COOKIE,
      renewed.refresh_token,
      cookieOptions(REFRESH_COOKIE_MAX_AGE_S),
    );
  }
  response.cookies.set(
    SEEN_COOKIE,
    String(now),
    cookieOptions(IDLE_MS / 1000 + 60),
  );
  return response;
}

function toSignIn(request: NextRequest, why: "idle" | "expired"): NextResponse {
  const target = new URL("/sign-in", request.url);
  target.searchParams.set("why", why);
  const response = NextResponse.redirect(target, 303);
  response.headers.set("cache-control", "private, no-store");
  for (const name of SESSION_COOKIES) {
    response.cookies.set(name, "", cookieOptions(0));
  }
  return response;
}

export const config = {
  matcher: [
    "/",
    "/overview/:path*",
    "/users/:path*",
    "/businesses/:path*",
    "/devices/:path*",
    "/synchronization/:path*",
    "/problem-reports/:path*",
    "/app-versions/:path*",
    "/audit-log/:path*",
    "/settings/:path*",
    "/health/:path*",
    "/maintenance/:path*",
    "/flags/:path*",
    "/associations/:path*",
    "/mfa/:path*",
    "/api/admin/:path*",
  ],
};
