import { expect, test } from "@playwright/test";

import { authenticateAs, MOCK_ROLE_COOKIE } from "./helpers/auth";

test.describe("development authentication", () => {
  test("the public sign-in page exposes only the supported mock roles", async ({
    page,
  }) => {
    const response = await page.goto("/sign-in");

    expect(response?.ok()).toBe(true);
    await expect(
      page.getByRole("heading", { name: "Sign in to KitaMo Admin" }),
    ).toBeVisible();
    await expect(
      page.getByText("Development-only access", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^Super Admin/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^Support Admin/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^Operations Viewer/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: /^(Super Admin|Support Admin|Operations Viewer)/,
      }),
    ).toHaveCount(3);
  });

  test("an unauthenticated protected request is redirected with a local return path", async ({
    page,
  }) => {
    await page.goto("/overview");

    await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Foverview$/);
    await expect(
      page.getByRole("heading", { name: "Sign in to KitaMo Admin" }),
    ).toBeVisible();
  });

  test("choosing a development role creates a protected session", async ({
    context,
    page,
  }) => {
    await page.goto("/sign-in?returnTo=%2Fusers");
    await page.getByRole("button", { name: /^Operations Viewer/ }).click();

    await expect(page).toHaveURL(/\/users$/);
    const cookie = (await context.cookies()).find(
      ({ name }) => name === MOCK_ROLE_COOKIE,
    );
    expect(cookie).toMatchObject({
      httpOnly: true,
      sameSite: "Lax",
      value: "operations_viewer",
    });
  });

  test("an unknown role cookie fails closed", async ({
    baseURL,
    context,
    page,
  }) => {
    if (!baseURL) throw new Error("Missing Playwright baseURL.");
    await context.addCookies([
      {
        name: MOCK_ROLE_COOKIE,
        value: "administrator",
        url: new URL("/", baseURL).toString(),
      },
    ]);

    await page.goto("/overview");

    await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Foverview$/);
  });

  test("a valid role can directly enter a protected route", async ({
    baseURL,
    context,
    page,
  }) => {
    await authenticateAs(context, baseURL, "super_admin");

    await page.goto("/overview");

    await expect(page).toHaveURL(/\/overview$/);
  });
});
