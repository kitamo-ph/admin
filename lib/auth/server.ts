import "server-only";

import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { getAdminService } from "@/lib/admin";
import type { AdminSessionState } from "@/lib/admin/r16-schemas";
import type { AdminService } from "@/lib/admin/service";

import {
  AdminAuthorizationError,
  authorize,
  hasPermission,
} from "./authorization";
import { verifyKitamoToken } from "./kitamo/login";
import {
  redirectFor,
  resolveKitamoSession,
  safeReturnTo,
  type KitamoResolution,
} from "./kitamo/resolve";
import { ACCESS_COOKIE, SEEN_COOKIE } from "./kitamo/session";
import {
  adminPermissionSchema,
  adminSessionSchema,
  type AdminPermission,
  type AdminSession,
} from "./model";
import { PARKED_PERMISSIONS } from "./routes";
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

export type AdminContext = {
  session: AdminSession;
  /** The adapter for this request: Core with the admin's own token, or the mock. */
  service: AdminService;
  /** km_admin_session: the label and live accesses (the banner). */
  state: AdminSessionState;
};

type Resolution =
  | ({ kind: "ready" } & AdminContext)
  | { kind: Exclude<KitamoResolution["kind"], "ready"> };

/**
 * Resolves the administrator once per request (React cache):
 *
 * 1. KitaMo's Auth (R16, ADM-048): the host-only cookie, the 30-minute idle,
 *    the vendored ES256 check, aal2, then Core's km_admin_session with the
 *    admin's own token. KM005 is "not permitted"; nothing is inferred here.
 * 2. Otherwise, in development and test only, the mock role cookie with the
 *    mock adapter (ADM-016/025). A production runtime ignores it.
 */
const resolveAdmin = cache(async (): Promise<Resolution> => {
  const jar = await cookies();
  const accessToken = jar.get(ACCESS_COOKIE)?.value;
  if (accessToken !== undefined && accessToken !== "") {
    const resolution = await resolveKitamoSession({
      accessToken,
      seen: jar.get(SEEN_COOKIE)?.value,
      now: Date.now(),
      verify: (token) => verifyKitamoToken(token),
      serviceFor: (token) => getAdminService(token),
    });
    if (resolution.kind !== "ready") return { kind: resolution.kind };
    const session = adminSessionSchema.parse({
      userId: resolution.claims.sub,
      displayName: resolution.state.label,
      role: "super_admin",
      provider: "kitamo",
    });
    return {
      kind: "ready",
      session,
      service: resolution.service,
      state: resolution.state,
    };
  }

  const mock = sessionFromDevelopmentRole(
    jar.get(DEVELOPMENT_ADMIN_ROLE_COOKIE)?.value,
  );
  const parsed = adminSessionSchema.safeParse(mock);
  if (!parsed.success) return { kind: "signed_out" };
  const service = getAdminService();
  const state = await service.getSession();
  return {
    kind: "ready",
    session: parsed.data,
    service,
    state: state.ok
      ? state.data
      : { label: parsed.data.displayName, accesses: [] },
  };
});

/**
 * Resolves and validates the current session on every call. Returns null
 * for every state that is not a usable administrator session.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const resolution = await resolveAdmin();
  return resolution.kind === "ready" ? resolution.session : null;
}

export async function requireAdminSession(
  returnTo = "/overview",
): Promise<AdminSession> {
  return (await requireAdminContext(returnTo)).session;
}

/** The layout's guard: a ready administrator, or a redirect. */
export async function requireAdminContext(
  returnTo = "/overview",
): Promise<AdminContext> {
  const resolution = await resolveAdmin();
  if (resolution.kind !== "ready") {
    redirect(redirectFor(resolution.kind, safeReturnTo(returnTo)));
  }
  return {
    session: resolution.session,
    service: resolution.service,
    state: resolution.state,
  };
}

/**
 * Page guard. It validates the permission argument, re-resolves the
 * session, and redirects without relying on Proxy as the security boundary.
 * Parked mock-first sections answer 404 to a KitaMo session (ADM-048).
 */
export async function requireAdminPermission(
  permissionInput: unknown,
  returnTo = "/overview",
): Promise<AdminSession> {
  return (await requireAdmin(permissionInput, returnTo)).session;
}

/** Page guard returning the request's adapter and the live accesses too. */
export async function requireAdmin(
  permissionInput: unknown,
  returnTo = "/overview",
): Promise<AdminContext> {
  const permission = parsePermission(permissionInput);
  const context = await requireAdminContext(returnTo);
  if (!hasPermission(context.session.role, permission)) {
    redirect("/access-denied");
  }
  if (
    context.session.provider === "kitamo" &&
    PARKED_PERMISSIONS.some((parked) => parked === permission)
  ) {
    notFound();
  }
  return context;
}

/**
 * Throwing guard for route handlers and server actions. Call it at the start
 * of every privileged operation; the caller can translate the typed errors to
 * its structured HTTP/action error format.
 */
export async function assertCurrentAdminPermission(
  permissionInput: unknown,
): Promise<AdminSession> {
  return (await assertCurrentAdmin(permissionInput)).session;
}

export async function assertCurrentAdmin(
  permissionInput: unknown,
): Promise<AdminContext> {
  const permission = parsePermission(permissionInput);
  const resolution = await resolveAdmin();

  if (resolution.kind !== "ready") {
    throw new AdminAuthenticationError();
  }

  const decision = authorize(resolution.session.role, permission);
  if (!decision.allowed) {
    throw new AdminAuthorizationError(resolution.session.role, permission);
  }

  return {
    session: resolution.session,
    service: resolution.service,
    state: resolution.state,
  };
}

function parsePermission(permissionInput: unknown): AdminPermission {
  const result = adminPermissionSchema.safeParse(permissionInput);
  if (!result.success) {
    throw new TypeError("Unknown admin permission.");
  }

  return result.data;
}
