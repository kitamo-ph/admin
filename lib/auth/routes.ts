import type { AdminPermission } from "./model";

export type AdminRouteRule = Readonly<{
  path: string;
  permission: AdminPermission;
}>;

/**
 * Rules are ordered by specificity. Detail pages inherit the permission of
 * their parent section through boundary-aware prefix matching.
 */
export const ADMIN_ROUTE_RULES = [
  { path: "/overview", permission: "overview:read" },
  { path: "/users", permission: "users:read" },
  { path: "/businesses", permission: "businesses:read" },
  { path: "/devices", permission: "devices:read" },
  { path: "/synchronization", permission: "synchronization:read" },
  { path: "/problem-reports", permission: "problem_reports:read" },
  { path: "/app-versions", permission: "app_versions:read" },
  { path: "/audit-log", permission: "audit_log:read" },
  { path: "/settings", permission: "settings:read" },
  { path: "/health", permission: "health:read" },
  { path: "/maintenance", permission: "health:read" },
  { path: "/", permission: "overview:read" },
] as const satisfies readonly AdminRouteRule[];

const PUBLIC_APP_PATHS = ["/sign-in", "/access-denied"] as const;
const PUBLIC_API_PATHS = ["/api/health"] as const;

export function permissionForAdminPath(
  pathnameInput: string,
): AdminPermission | null {
  const pathname = normalizePathname(pathnameInput);
  const rule = ADMIN_ROUTE_RULES.find(({ path }) =>
    matchesRouteBoundary(pathname, path),
  );

  return rule?.permission ?? null;
}

export function isPublicAppPath(pathnameInput: string): boolean {
  const pathname = normalizePathname(pathnameInput);
  return [...PUBLIC_APP_PATHS, ...PUBLIC_API_PATHS].some((path) =>
    matchesRouteBoundary(pathname, path),
  );
}

export function isProtectedAdminPath(pathnameInput: string): boolean {
  const pathname = normalizePathname(pathnameInput);
  if (isPublicAppPath(pathname)) {
    return false;
  }

  return (
    permissionForAdminPath(pathname) !== null ||
    matchesRouteBoundary(pathname, "/api/admin")
  );
}

function matchesRouteBoundary(pathname: string, routePath: string): boolean {
  if (routePath === "/") {
    return pathname === "/";
  }

  return pathname === routePath || pathname.startsWith(`${routePath}/`);
}

function normalizePathname(pathnameInput: string): string {
  const pathname = pathnameInput.split(/[?#]/, 1)[0] || "/";
  if (pathname === "/") {
    return pathname;
  }

  return `/${pathname.replace(/^\/+|\/+$/g, "")}`;
}
