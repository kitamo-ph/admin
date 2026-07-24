import {
  adminRoleSchema,
  adminSessionSchema,
  type AdminSession,
} from "./model";

export const DEVELOPMENT_ADMIN_ROLE_COOKIE = "kitamo_admin_mock_role";

const DEVELOPMENT_ADMIN_USER_ID = "mock-kita-admin";
const DEVELOPMENT_ADMIN_DISPLAY_NAME = "KitaMo development administrator";

/**
 * There is deliberately no environment-variable override. A production build
 * must never accept a client-controlled mock role cookie.
 */
export function isDevelopmentRoleSwitchingEnabled(
  environment = process.env.NODE_ENV,
): boolean {
  return environment === "development" || environment === "test";
}

export function sessionFromDevelopmentRole(
  cookieValue: unknown,
  environment = process.env.NODE_ENV,
): AdminSession | null {
  if (!isDevelopmentRoleSwitchingEnabled(environment)) {
    return null;
  }

  const roleResult = adminRoleSchema.safeParse(cookieValue);
  if (!roleResult.success) {
    return null;
  }

  const sessionResult = adminSessionSchema.safeParse({
    userId: DEVELOPMENT_ADMIN_USER_ID,
    displayName: DEVELOPMENT_ADMIN_DISPLAY_NAME,
    role: roleResult.data,
    provider: "mock",
  });

  return sessionResult.success ? sessionResult.data : null;
}
