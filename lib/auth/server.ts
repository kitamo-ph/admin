import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  AdminAuthorizationError,
  authorize,
  hasPermission,
} from "./authorization";
import {
  adminPermissionSchema,
  adminSessionSchema,
  type AdminPermission,
  type AdminSession,
} from "./model";
import {
  DEVELOPMENT_ADMIN_ROLE_COOKIE,
  sessionFromDevelopmentRole,
} from "./session";

export class AdminAuthenticationError extends Error {
  readonly code = "ADMIN_AUTHENTICATION_REQUIRED";
  readonly status = 401;

  constructor() {
    super("An authenticated administrator session is required.");
    this.name = "AdminAuthenticationError";
  }
}

/**
 * Resolves and validates the current session on every call. The mock resolver
 * is fail-closed in production; a future Clerk resolver belongs at this
 * boundary and must return data accepted by adminSessionSchema.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const candidate = sessionFromDevelopmentRole(
    cookieStore.get(DEVELOPMENT_ADMIN_ROLE_COOKIE)?.value,
  );
  const result = adminSessionSchema.safeParse(candidate);

  return result.success ? result.data : null;
}

export async function requireAdminSession(
  returnTo = "/overview",
): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) {
    redirect(signInPath(returnTo));
  }

  return session;
}

/**
 * Page/layout guard. It validates the permission argument, re-resolves the
 * session, and redirects without relying on Proxy as the security boundary.
 */
export async function requireAdminPermission(
  permissionInput: unknown,
  returnTo = "/overview",
): Promise<AdminSession> {
  const permission = parsePermission(permissionInput);
  const session = await getAdminSession();

  if (!session) {
    redirect(signInPath(returnTo));
  }

  if (!hasPermission(session.role, permission)) {
    redirect("/access-denied");
  }

  return session;
}

/**
 * Throwing guard for route handlers and server actions. Call it at the start
 * of every privileged operation; the caller can translate the typed errors to
 * its structured HTTP/action error format.
 */
export async function assertCurrentAdminPermission(
  permissionInput: unknown,
): Promise<AdminSession> {
  const permission = parsePermission(permissionInput);
  const session = await getAdminSession();

  if (!session) {
    throw new AdminAuthenticationError();
  }

  const decision = authorize(session.role, permission);
  if (!decision.allowed) {
    throw new AdminAuthorizationError(session.role, permission);
  }

  return session;
}

function parsePermission(permissionInput: unknown): AdminPermission {
  const result = adminPermissionSchema.safeParse(permissionInput);
  if (!result.success) {
    throw new TypeError("Unknown admin permission.");
  }

  return result.data;
}

function signInPath(returnTo: string): string {
  const safeReturnTo = safeRelativeReturnTo(returnTo);
  return `/sign-in?returnTo=${encodeURIComponent(safeReturnTo)}`;
}

function safeRelativeReturnTo(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/overview";
  }

  try {
    const url = new URL(value, "https://admin.kitamo.online");
    if (url.origin !== "https://admin.kitamo.online") {
      return "/overview";
    }

    return `${url.pathname}${url.search}`;
  } catch {
    return "/overview";
  }
}
