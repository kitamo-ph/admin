import { type NextRequest, NextResponse } from "next/server";

import { hasPermission } from "@/lib/auth/authorization";
import {
  isProtectedAdminPath,
  permissionForAdminPath,
} from "@/lib/auth/routes";
import {
  DEVELOPMENT_ADMIN_ROLE_COOKIE,
  sessionFromDevelopmentRole,
} from "@/lib/auth/session";

export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;

  if (!isProtectedAdminPath(pathname)) {
    return NextResponse.next();
  }

  const session = sessionFromDevelopmentRole(
    request.cookies.get(DEVELOPMENT_ADMIN_ROLE_COOKIE)?.value,
  );

  if (!session) {
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
    "/api/admin/:path*",
  ],
};
