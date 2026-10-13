import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import {
  ADMIN_PERMISSIONS,
  ADMIN_ROLES,
  DEVELOPMENT_ADMIN_ROLE_COOKIE,
  ROLE_PERMISSIONS,
  assertPermission,
  authorize,
  hasPermission,
  isMfaPath,
  isParkedAdminPath,
  isProtectedAdminPath,
  isPublicAppPath,
  PARKED_ADMIN_PATHS,
  R16_ADMIN_PATHS,
  permissionForAdminPath,
  permissionsForRole,
  sessionFromDevelopmentRole,
} from "@/lib/auth";
import { proxy } from "@/proxy";

describe("admin authorization", () => {
  it("gives super administrators every declared permission", () => {
    expect(ROLE_PERMISSIONS.super_admin).toEqual(ADMIN_PERMISSIONS);

    for (const permission of ADMIN_PERMISSIONS) {
      expect(hasPermission("super_admin", permission)).toBe(true);
    }
  });

  it("allows support administrators to read support data and update reports", () => {
    const allowed = [
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
    ] as const;

    for (const permission of allowed) {
      expect(hasPermission("support_admin", permission)).toBe(true);
    }

    expect(hasPermission("support_admin", "settings:read")).toBe(false);
  });

  it("keeps operations viewers read-only with limited user access", () => {
    const allowed = [
      "overview:read",
      "users:read",
      "businesses:read",
      "devices:read",
      "synchronization:read",
      "problem_reports:read",
      "app_versions:read",
      "audit_log:read",
      "health:read",
    ] as const;

    for (const permission of allowed) {
      expect(hasPermission("operations_viewer", permission)).toBe(true);
    }

    expect(hasPermission("operations_viewer", "problem_reports:update")).toBe(
      false,
    );
    expect(hasPermission("operations_viewer", "settings:read")).toBe(false);
  });

  it("fails closed for invalid roles and permissions", () => {
    expect(authorize("owner", "users:read")).toEqual({
      allowed: false,
      reason: "invalid_role",
    });
    expect(authorize("super_admin", "transactions:read")).toEqual({
      allowed: false,
      reason: "invalid_permission",
    });
    expect(permissionsForRole("owner")).toEqual([]);
    expect(() => assertPermission("owner", "users:read")).toThrow(TypeError);
  });

  it("does not accidentally share mutable permission collections", () => {
    for (const role of ADMIN_ROLES) {
      expect(permissionsForRole(role)).toBe(ROLE_PERMISSIONS[role]);
    }
  });
});

describe("route authorization", () => {
  it("maps sections and nested detail pages to granular permissions", () => {
    expect(permissionForAdminPath("/")).toBe("overview:read");
    expect(permissionForAdminPath("/overview")).toBe("overview:read");
    expect(permissionForAdminPath("/users/usr_mock_001")).toBe("users:read");
    expect(permissionForAdminPath("/businesses/biz_mock_001")).toBe(
      "businesses:read",
    );
    expect(permissionForAdminPath("/devices/dev_mock_001")).toBe(
      "devices:read",
    );
    expect(permissionForAdminPath("/problem-reports/report_mock_001")).toBe(
      "problem_reports:read",
    );
    expect(permissionForAdminPath("/settings/security")).toBe("settings:read");
    expect(permissionForAdminPath("/maintenance")).toBe("health:read");
  });

  it("uses path boundaries instead of unsafe string prefixes", () => {
    expect(permissionForAdminPath("/users-archive")).toBeNull();
    expect(permissionForAdminPath("/settings-old")).toBeNull();
    expect(isProtectedAdminPath("/api/administrator")).toBe(false);
  });

  it("keeps sign-in, denied, and the basic health endpoint public", () => {
    expect(isPublicAppPath("/sign-in")).toBe(true);
    expect(isPublicAppPath("/access-denied")).toBe(true);
    expect(isPublicAppPath("/api/health")).toBe(true);

    expect(isProtectedAdminPath("/sign-in")).toBe(false);
    expect(isProtectedAdminPath("/access-denied")).toBe(false);
    expect(isProtectedAdminPath("/api/health")).toBe(false);
    expect(isProtectedAdminPath("/health")).toBe(true);
    expect(isProtectedAdminPath("/maintenance")).toBe(true);
  });
});

describe("development role sessions", () => {
  it("creates a validated mock session in development and test only", () => {
    expect(
      sessionFromDevelopmentRole("support_admin", "development"),
    ).toMatchObject({
      role: "support_admin",
      provider: "mock",
    });
    expect(
      sessionFromDevelopmentRole("operations_viewer", "test"),
    ).toMatchObject({
      role: "operations_viewer",
      provider: "mock",
    });
  });

  it("never accepts a mock role cookie in production", () => {
    for (const role of ADMIN_ROLES) {
      expect(sessionFromDevelopmentRole(role, "production")).toBeNull();
    }
  });

  it("rejects an invalid or absent mock role", () => {
    expect(sessionFromDevelopmentRole("owner", "development")).toBeNull();
    expect(sessionFromDevelopmentRole(undefined, "development")).toBeNull();
  });
});

describe("admin proxy", () => {
  it("redirects an unauthenticated protected request to sign-in safely", async () => {
    const response = await proxy(
      new NextRequest("https://admin.kitamo.online/users?status=active"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://admin.kitamo.online/sign-in?returnTo=%2Fusers%3Fstatus%3Dactive",
    );
  });

  it("redirects an authenticated but unauthorized role to access denied", async () => {
    const response = await proxy(
      developmentRequest(
        "https://admin.kitamo.online/settings",
        "support_admin",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://admin.kitamo.online/access-denied",
    );
  });

  it("allows an authenticated role with the route permission", async () => {
    const response = await proxy(
      developmentRequest(
        "https://admin.kitamo.online/problem-reports/report_mock_001",
        "operations_viewer",
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});

function developmentRequest(url: string, role: string): NextRequest {
  return new NextRequest(url, {
    headers: {
      cookie: `${DEVELOPMENT_ADMIN_ROLE_COOKIE}=${encodeURIComponent(role)}`,
    },
  });
}

describe("R16 routes and permissions (ADM-048)", () => {
  it("routes the R16 sections and keeps the MFA steps out of the permission map", () => {
    expect(permissionForAdminPath("/flags")).toBe("flags:read");
    expect(permissionForAdminPath("/associations")).toBe("associations:read");
    expect(permissionForAdminPath("/businesses/0b0/records")).toBe(
      "businesses:read",
    );
    expect(permissionForAdminPath("/mfa")).toBeNull();
    expect(isMfaPath("/mfa/enroll")).toBe(true);
    expect(isMfaPath("/mfa-old")).toBe(false);
    expect(isPublicAppPath("/api/session/mfa")).toBe(true);
  });

  it("parks the mock-first sections, not the R16 ones", () => {
    for (const path of PARKED_ADMIN_PATHS) {
      expect(isParkedAdminPath(`${path}/x`)).toBe(true);
    }
    for (const path of R16_ADMIN_PATHS) {
      expect(isParkedAdminPath(path)).toBe(false);
    }
  });

  it("gives the R16 writes to super admins only", () => {
    for (const permission of [
      "flags:update",
      "business_access:open",
    ] as const) {
      expect(hasPermission("super_admin", permission)).toBe(true);
      expect(hasPermission("support_admin", permission)).toBe(false);
      expect(hasPermission("operations_viewer", permission)).toBe(false);
    }
    expect(hasPermission("operations_viewer", "flags:read")).toBe(true);
  });
});

describe("admin proxy with a KitaMo session", () => {
  const now = Date.now();
  const token = (exp: number) =>
    `h.${Buffer.from(JSON.stringify({ exp })).toString("base64url")}.s`;
  const kitamoRequest = (url: string, seen: number, exp: number) =>
    new NextRequest(url, {
      headers: {
        cookie: `adm_at=${token(exp)}; adm_rt=refresh-1; adm_seen=${seen}`,
      },
    });

  it("lets a fresh session through and marks the activity", async () => {
    const response = await proxy(
      kitamoRequest(
        "https://admin.kitamo.online/flags",
        now - 60_000,
        Math.floor(now / 1000) + 600,
      ),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const seen = response.cookies.get("adm_seen");
    expect(seen?.httpOnly).toBe(true);
    expect(Number(seen?.value)).toBeGreaterThanOrEqual(now);
  });

  it("signs out after 30 minutes idle and clears every session cookie", async () => {
    const response = await proxy(
      kitamoRequest(
        "https://admin.kitamo.online/overview",
        now - 31 * 60_000,
        Math.floor(now / 1000) + 600,
      ),
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://admin.kitamo.online/sign-in?why=idle",
    );
    for (const name of ["adm_at", "adm_rt", "adm_seen"]) {
      expect(response.cookies.get(name)?.value).toBe("");
    }
  });

  it("sends a token it cannot refresh to the sign-in", async () => {
    // No KITAMO_SUPABASE_URL in unit tests: the refresh fails closed.
    const response = await proxy(
      kitamoRequest(
        "https://admin.kitamo.online/overview",
        now - 60_000,
        Math.floor(now / 1000) + 30,
      ),
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://admin.kitamo.online/sign-in?why=expired",
    );
  });

  it("needs a session for the MFA steps", async () => {
    const response = await proxy(
      new NextRequest("https://admin.kitamo.online/mfa"),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://admin.kitamo.online/sign-in?returnTo=%2Fmfa",
    );
  });
});
