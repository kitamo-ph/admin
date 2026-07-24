import type { BrowserContext } from "@playwright/test";

export const MOCK_ROLE_COOKIE = "kitamo_admin_mock_role";

export type MockAdminRole =
  "super_admin" | "support_admin" | "operations_viewer";

export async function authenticateAs(
  context: BrowserContext,
  baseURL: string | undefined,
  role: MockAdminRole,
): Promise<void> {
  if (!baseURL) {
    throw new Error("Playwright baseURL is required for mock authentication.");
  }

  await context.addCookies([
    {
      name: MOCK_ROLE_COOKIE,
      value: role,
      url: new URL("/", baseURL).toString(),
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
