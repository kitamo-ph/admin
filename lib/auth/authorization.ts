import {
  ADMIN_PERMISSIONS,
  adminPermissionSchema,
  adminRoleSchema,
  type AdminPermission,
  type AdminRole,
} from "./model";

export const ROLE_PERMISSIONS = {
  super_admin: ADMIN_PERMISSIONS,
  support_admin: [
    "overview:read",
    "users:read",
    "businesses:read",
    "devices:read",
    "synchronization:read",
    "problem_reports:read",
    "problem_reports:update",
    "app_versions:read",
    "audit_log:read",
    "health:read",
  ],
  operations_viewer: [
    "overview:read",
    "users:read",
    "businesses:read",
    "devices:read",
    "synchronization:read",
    "problem_reports:read",
    "app_versions:read",
    "audit_log:read",
    "health:read",
  ],
} as const satisfies Record<AdminRole, readonly AdminPermission[]>;

export type AuthorizationDenialReason =
  "invalid_role" | "invalid_permission" | "permission_denied";

export type AuthorizationDecision =
  | {
      allowed: true;
      role: AdminRole;
      permission: AdminPermission;
    }
  | {
      allowed: false;
      reason: AuthorizationDenialReason;
    };

/**
 * Evaluates untrusted role and permission values. Invalid values always fail
 * closed instead of being coerced to a default role.
 */
export function authorize(
  roleInput: unknown,
  permissionInput: unknown,
): AuthorizationDecision {
  const roleResult = adminRoleSchema.safeParse(roleInput);
  if (!roleResult.success) {
    return { allowed: false, reason: "invalid_role" };
  }

  const permissionResult = adminPermissionSchema.safeParse(permissionInput);
  if (!permissionResult.success) {
    return { allowed: false, reason: "invalid_permission" };
  }

  const role = roleResult.data;
  const permission = permissionResult.data;

  if (!ROLE_PERMISSIONS[role].some((candidate) => candidate === permission)) {
    return { allowed: false, reason: "permission_denied" };
  }

  return { allowed: true, role, permission };
}

export function hasPermission(
  roleInput: unknown,
  permissionInput: unknown,
): boolean {
  return authorize(roleInput, permissionInput).allowed;
}

export function permissionsForRole(
  roleInput: unknown,
): readonly AdminPermission[] {
  const result = adminRoleSchema.safeParse(roleInput);
  return result.success ? ROLE_PERMISSIONS[result.data] : [];
}

export class AdminAuthorizationError extends Error {
  readonly code = "ADMIN_PERMISSION_DENIED";
  readonly status = 403;

  constructor(
    readonly role: AdminRole,
    readonly permission: AdminPermission,
  ) {
    super(`Role "${role}" does not have permission "${permission}".`);
    this.name = "AdminAuthorizationError";
  }
}

export function assertPermission(
  roleInput: unknown,
  permissionInput: unknown,
): asserts roleInput is AdminRole {
  const decision = authorize(roleInput, permissionInput);
  if (decision.allowed) {
    return;
  }

  const roleResult = adminRoleSchema.safeParse(roleInput);
  const permissionResult = adminPermissionSchema.safeParse(permissionInput);

  if (!roleResult.success || !permissionResult.success) {
    throw new TypeError(
      `Invalid authorization input (${decision.reason.replaceAll("_", " ")}).`,
    );
  }

  throw new AdminAuthorizationError(roleResult.data, permissionResult.data);
}
