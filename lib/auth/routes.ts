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
  { path: "/flags", permission: "flags:read" },
  { path: "/associations", permission: "associations:read" },
  { path: "/settings", permission: "settings:read" },
  { path: "/health", permission: "health:read" },
  { path: "/maintenance", permission: "health:read" },
  { path: "/", permission: "overview:read" },
] as const satisfies readonly AdminRouteRule[];

const PUBLIC_APP_PATHS = ["/sign-in", "/access-denied"] as const;
const PUBLIC_API_PATHS = ["/api/health", "/api/session"] as const;

/**
 * The MFA steps need a KitaMo session (any aal) but no admin permission: the
 * page itself checks the token. Proxy refreshes and idles them like the rest.
 */
export const MFA_PATH = "/mfa";

/**
 * Mock-first sections parked until R23 (ADM-048). A KitaMo (production)
 * session never sees them: they leave the navigation and answer 404. The
 * development role cookie still reaches them for the mock beta's tests.
 */
export const PARKED_ADMIN_PATHS = [
  "/users",
  "/devices",
  "/synchronization",
  "/problem-reports",
  "/app-versions",
  "/settings",
  "/health",
] as const;

/** The permissions of the parked sections: a KitaMo session gets 404. */
export const PARKED_PERMISSIONS = [
  "users:read",
  "devices:read",
  "synchronization:read",
  "problem_reports:read",
  "problem_reports:update",
  "app_versions:read",
  "settings:read",
  "health:read",
] as const satisfies readonly AdminPermission[];

/** The R16 navigation, in order. */
export const R16_ADMIN_PATHS = [
  "/overview",
  "/businesses",
  "/flags",
  "/audit-log",
  "/associations",
] as const;

export function isParkedAdminPath(pathnameInput: string): boolean {
  const pathname = normalizePathname(pathnameInput);
  return PARKED_ADMIN_PATHS.some((path) =>
    matchesRouteBoundary(pathname, path),
  );
}

export function isMfaPath(pathnameInput: string): boolean {
  return matchesRouteBoundary(normalizePathname(pathnameInput), MFA_PATH);
}

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
