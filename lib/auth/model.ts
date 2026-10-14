import { z } from "zod";

export const ADMIN_ROLES = [
  "super_admin",
  "support_admin",
  "operations_viewer",
] as const;

export const adminRoleSchema = z.enum(ADMIN_ROLES);

export type AdminRole = z.infer<typeof adminRoleSchema>;

export const ADMIN_PERMISSIONS = [
  "overview:read",
  "users:read",
  "businesses:read",
  "devices:read",
  "synchronization:read",
  "problem_reports:read",
  "problem_reports:update",
  "app_versions:read",
  "audit_log:read",
  "settings:read",
  "health:read",
  // R16 (ADM-048). Core's km_admin_can is the gate; these only route.
  "flags:read",
  "flags:update",
  "business_access:open",
  "associations:read",
  "associations:update",
] as const;

export const adminPermissionSchema = z.enum(ADMIN_PERMISSIONS);

export type AdminPermission = z.infer<typeof adminPermissionSchema>;

export const ADMIN_MUTATION_PERMISSIONS = [
  "problem_reports:update",
  "flags:update",
  "business_access:open",
  "associations:update",
] as const satisfies readonly AdminPermission[];

export type AdminMutationPermission =
  (typeof ADMIN_MUTATION_PERMISSIONS)[number];

export const adminSessionSchema = z.object({
  userId: z.string().min(1),
  displayName: z.string().min(1),
  role: adminRoleSchema,
  /**
   * `kitamo`: KitaMo's Auth at aal2 with a live platform_admins row (R16,
   * ADM-048). `mock`: the development role cookie, never in production.
   * `clerk` is kept for the record; ADM-048 dropped Clerk from the plan.
   */
  provider: z.enum(["mock", "kitamo", "clerk"]),
});

export type AdminSession = z.infer<typeof adminSessionSchema>;
