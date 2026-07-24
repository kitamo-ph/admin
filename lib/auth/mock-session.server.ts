import "server-only";

import { cookies } from "next/headers";

import { adminRoleSchema, type AdminRole } from "./model";
import {
  DEVELOPMENT_ADMIN_ROLE_COOKIE,
  isDevelopmentRoleSwitchingEnabled,
} from "./session";

const MOCK_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export async function setDevelopmentAdminRole(
  roleInput: unknown,
): Promise<AdminRole> {
  assertDevelopmentRoleSwitchingEnabled();

  const result = adminRoleSchema.safeParse(roleInput);
  if (!result.success) {
    throw new TypeError("Unknown admin role.");
  }

  const cookieStore = await cookies();
  cookieStore.set(DEVELOPMENT_ADMIN_ROLE_COOKIE, result.data, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: MOCK_SESSION_MAX_AGE_SECONDS,
  });

  return result.data;
}

export async function clearDevelopmentAdminSession(): Promise<void> {
  assertDevelopmentRoleSwitchingEnabled();

  const cookieStore = await cookies();
  cookieStore.delete(DEVELOPMENT_ADMIN_ROLE_COOKIE);
}

function assertDevelopmentRoleSwitchingEnabled(): void {
  if (!isDevelopmentRoleSwitchingEnabled()) {
    throw new Error(
      "Development role switching is unavailable in production builds.",
    );
  }
}
